import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrg } from '@/lib/org'
import { withOrderAdvisoryLock } from '@/lib/db/locks'
import { createClient } from '@/lib/supabase/server'
import { logError, logInfo, logWarn } from '@/lib/logging'
// CORE_MODE
import { CORE_MODE } from '@/lib/config/coreMode'
import { assertRateConsistency } from '@/lib/ship/rateGuard'
import { determineAccountKind, getAccessToken, postShipment, FedExError, AccountKind } from '@/lib/fedex/client'
import { put } from '@vercel/blob'
// ensurePost
import { ensurePost } from '@/lib/http/ensurePost'

function envBool(name: string, def = false): boolean {
	const v = process.env[name]
	if (v == null) return def
	return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())
}

// MW-REMOVED: middleware撤去に伴い、CSRF等の前処理は行わない

const partySchema = z.object({
	name: z.string().min(1),
	phone: z.string().min(5),
	address1: z.string().min(1),
	address2: z.string().optional(),
	city: z.string().min(1),
	state: z.string().optional(),
	postalCode: z.string().min(1),
	country: z.string().length(2).transform(s => s.toUpperCase()),
})

const pkgSchema = z.object({
	weight: z.object({ value: z.number().positive(), unit: z.enum(['KG', 'LB']) }),
	dimensions: z.object({ length: z.number().positive(), width: z.number().positive(), height: z.number().positive(), unit: z.enum(['CM', 'IN']) }),
})

const bodySchema = z.object({
	orderId: z.string().min(1),
	reference: z.string().optional(),
	serviceType: z.string().min(1),
	bill: z.object({ payer: z.enum(['SENDER', 'RECIPIENT', 'THIRD_PARTY']) }),
	shipper: partySchema,
	recipient: partySchema,
	package: pkgSchema,
	htsCode: z.string().max(10).regex(/^\d+$/).optional(),
})

type CreateShipRequest = z.infer<typeof bodySchema>

type CreateShipResponse = {
	trackingNumber: string
	labelUrl: string
	serviceType: string
	rate: number
	currency: string
	htsCode?: string
}

async function verifyPayment(orderId: string): Promise<{ amount: number; currency: string; paymentId: string } | null> {
	try {
		const { SquareClient, SquareEnvironment } = await import('square') as any
		const token = process.env.SQUARE_ACCESS_TOKEN
		if (!token) return null
		const client = new SquareClient({ token, environment: process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox })
		const resp = await client.paymentsApi.getPayment(orderId)
		const p = resp?.result?.payment
		if (!p) return null
		const ok = ['COMPLETED', 'APPROVED', 'CAPTURED'].includes(String(p.status || '').toUpperCase())
		if (!ok) return null
		return { amount: Number(p.amountMoney?.amount ?? 0), currency: String(p.amountMoney?.currency || 'JPY'), paymentId: String(p.id) }
	} catch {
		return null
	}
}

function chooseAccountKind(shipperCountry: string, recipientCountry: string): AccountKind {
	const s = (shipperCountry || '').toUpperCase()
	const r = (recipientCountry || '').toUpperCase()
	if (s === 'JP') return 'export'
	if (r === 'JP') return 'import'
	return 'export'
}

function toKg(value: number, unit: 'KG' | 'LB'): number {
	return unit === 'KG' ? value : value * 0.45359237
}
function toCm(value: number, unit: 'CM' | 'IN'): number {
	return unit === 'CM' ? value : value * 2.54
}

export async function POST(req: NextRequest) {
  // ensurePost: POST以外は405
  const early = ensurePost(req)
  if (early) return early

	if (process.env.SHIP_API_WRITE_ENABLED !== 'true') {
    const snapshot = await req.json().catch(() => ({}))
    // SR-D: 生ログ出力（PIIマスク撤去）
    logInfo('ship_create_blocked', { reason: 'WRITE_DISABLED', input: snapshot })
		return NextResponse.json({ code: 'WRITE_DISABLED' }, { status: 503 })
	}

	let input: CreateShipRequest
	try {
		input = bodySchema.parse(await req.json())
	} catch (e) {
		return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid payload' }, { status: 400 })
	}

    // HTS code validation: US destination requires numeric up to 10 digits
    if ((input?.recipient?.country || '').toUpperCase() === 'US') {
        const code = input.htsCode ?? ''
        const ok = typeof code === 'string' && /^\d{1,10}$/.test(code)
        if (!ok) {
            return NextResponse.json({ error: 'HTS_CODE_REQUIRED' }, { status: 400 })
        }
    }

	let userId: string, orgId: string
	try {
		const org = await requireOrg()
		userId = org.userId
		orgId = org.orgId
	} catch {
		return NextResponse.json({ code: 'QL-AUTH', message: 'Unauthorized' }, { status: 401 })
	}

  const supabase = createClient()

	// Idempotency: return existing if present
	{
		const { data: existing } = await supabase
			.from('shipments')
			.select('*')
			.filter('order_id', 'eq', input.orderId as any)
			.maybeSingle()
        if (existing && (existing as any).tracking_number && (existing as any).label_blob_url) {
			logInfo('ship_create_idempotent', { orderId: input.orderId, orgId })
			return NextResponse.json({
                trackingNumber: (existing as any).tracking_number as string,
				labelUrl: (existing as any).label_blob_url as string,
                serviceType: (existing as any).service_type || input.serviceType,
                rate: Number((existing as any).rate_total ?? 0),
                currency: (existing as any).currency || 'JPY',
			} satisfies CreateShipResponse)
		}
	}

	const pay = await verifyPayment(input.orderId)
	if (!pay) {
		return NextResponse.json({ code: 'PAYMENT_REQUIRED' }, { status: 402 })
	}

	await assertRateConsistency({ orderId: input.orderId, shipTotal: pay.amount, currency: pay.currency })

	const kind = chooseAccountKind(input.shipper.country, input.recipient.country)
	const weightKg = toKg(input.package.weight.value, input.package.weight.unit)
	const lengthCm = toCm(input.package.dimensions.length, input.package.dimensions.unit)
	const widthCm = toCm(input.package.dimensions.width, input.package.dimensions.unit)
	const heightCm = toCm(input.package.dimensions.height, input.package.dimensions.unit)

	async function doShip(): Promise<NextResponse> {
		// Narrow race window by re-checking
		{
			const { data: existing } = await supabase
				.from('shipments')
				.select('*')
				.filter('order_id', 'eq', input.orderId as any)
				.maybeSingle()
            if (existing && (existing as any).tracking_number && (existing as any).label_blob_url) {
				return NextResponse.json({
                    trackingNumber: (existing as any).tracking_number as string,
					labelUrl: (existing as any).label_blob_url as string,
                    serviceType: (existing as any).service_type || input.serviceType,
                    rate: Number((existing as any).rate_total ?? 0),
                    currency: (existing as any).currency || 'JPY',
				} satisfies CreateShipResponse)
			}
		}

		// Build minimal FedEx payload and call
		const payload = {
			accountNumber: { value: process.env[kind === 'export' ? 'FEDEX_EXPORT_ACCOUNT_NUMBER' : 'FEDEX_IMPORT_ACCOUNT_NUMBER']! },
			labelResponseOptions: 'URL_ONLY',
			requestedShipment: {
				shipper: {
					contact: { personName: input.shipper.name, phoneNumber: input.shipper.phone },
					address: {
						streetLines: [input.shipper.address1, input.shipper.address2 || ''].filter(Boolean),
						city: input.shipper.city,
						stateOrProvinceCode: input.shipper.state || undefined,
						postalCode: input.shipper.postalCode,
						countryCode: input.shipper.country,
					},
				},
				recipients: [
					{
						contact: { personName: input.recipient.name, phoneNumber: input.recipient.phone },
						address: {
							streetLines: [input.recipient.address1, input.recipient.address2 || ''].filter(Boolean),
							city: input.recipient.city,
							stateOrProvinceCode: input.recipient.state || undefined,
							postalCode: input.recipient.postalCode,
							countryCode: input.recipient.country,
							residential: false,
						},
					},
				],
				serviceType: input.serviceType,
				packagingType: 'YOUR_PACKAGING',
				pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
				shippingChargesPayment: { paymentType: input.bill.payer },
				requestedPackageLineItems: [
					{
						sequenceNumber: 1,
						groupPackageCount: 1,
						weight: { units: 'KG', value: Number(weightKg.toFixed(3)) },
						dimensions: { length: Math.round(lengthCm), width: Math.round(widthCm), height: Math.round(heightCm), units: 'CM' },
					},
				],
			},
		}

		let tracking = ''
		let rate = 0
		let currency = 'JPY'
		let labelUrl = ''

		try {
			const res = await postShipment<any>(payload, kind)
			const ts = res?.output?.transactionShipments?.[0]
			tracking = ts?.masterTrackingNumber || ts?.pieceResponses?.[0]?.trackingNumber || ''
			const doc = ts?.pieceResponses?.[0]?.packageDocuments?.[0]
			const charge = ts?.shipmentDocuments?.[0]?.totalNetCharge
			rate = Number(charge?.amount ?? pay.amount)
			currency = String(charge?.currency ?? pay.currency ?? 'JPY')
			const fedexLabelUrl: string | undefined = doc?.url
			if (!fedexLabelUrl) throw new Error('LABEL_URL_MISSING')
			const token = await getAccessToken(kind)
			const pdfResp = await fetch(fedexLabelUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } })
			if (!pdfResp.ok) throw new Error(`LABEL_FETCH_${pdfResp.status}`)
			const buf = Buffer.from(await pdfResp.arrayBuffer())
			const now = new Date()
			const yyyy = String(now.getUTCFullYear())
			const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
			const path = `labels/${yyyy}/${mm}/${input.orderId}-${tracking}.pdf`
			const blobToken = process.env.BLOB_READ_WRITE_TOKEN
			if (!blobToken) {
				logError('ship_create_blob_missing', { orderId: input.orderId })
				return NextResponse.json({ code: 'BLOB_CONFIG' }, { status: 500 })
			}
			const blob = await put(path, buf, { access: 'public', contentType: 'application/pdf', token: blobToken })
			labelUrl = blob.url
		} catch (e) {
			if (e instanceof FedExError) {
				logError('ship_create_failed', { orderId: input.orderId, orgId, code: e.code, details: e.details })
				return NextResponse.json({ code: e.code, message: e.message }, { status: e.code || 502 })
			}
			logError('ship_create_failed', { orderId: input.orderId, orgId, error: String((e as Error)?.message || e) })
			return NextResponse.json({ code: 'SHIP_FAILED' }, { status: 502 })
		}

		try {
			const row: any = {
				order_id: input.orderId,
				org_id: orgId,
				user_id: userId,
				tracking_number: tracking,
				service_type: input.serviceType,
				fedex_account_kind: kind,
				rate_total: rate,
				currency,
				label_blob_url: labelUrl,
				square_payment_id: pay.paymentId,
				payment_status: 'completed',
				hts_code: input.htsCode ?? null,
			}
			const ins = await supabase.from('shipments').insert([row] as any).select('*').maybeSingle()
			if (ins.error && String(ins.error?.message || '').includes('duplicate')) {
				const { data: existing } = await supabase
					.from('shipments')
					.select('*')
					.filter('order_id', 'eq', input.orderId as any)
					.maybeSingle()
                if (existing) {
					return NextResponse.json({
                        trackingNumber: (existing as any).tracking_number as string,
						labelUrl: (existing as any).label_blob_url as string,
						serviceType: (existing as any).service_type || input.serviceType,
                        rate: Number((existing as any).rate_total ?? rate),
						currency: (existing as any).currency || currency,
					} satisfies CreateShipResponse)
				}
			}
		} catch (e) {
      // SR-D: 生ログ出力
      logError('ship_create_persist_failed', { orderId: input.orderId, labelUrl })
			return NextResponse.json({ code: 'PERSIST_FAILED' }, { status: 500 })
		}

		logInfo('ship_create_succeeded', { orderId: input.orderId, orgId, trackingNumber: tracking, accountKind: kind })
		return NextResponse.json({ trackingNumber: tracking, labelUrl, serviceType: input.serviceType, rate, currency, htsCode: input.htsCode } satisfies CreateShipResponse)
	}

	try {
		return await withOrderAdvisoryLock(input.orderId, doShip)
	} catch {
		return await doShip()
	}
}
