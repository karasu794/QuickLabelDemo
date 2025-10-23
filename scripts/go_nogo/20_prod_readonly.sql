-- READ ONLY
select a.id, a.created_at from attachments a left join shipments s on s.id=a.shipment_id where s.id is null and a.created_at > now() - interval '7 days';
select quote_job_id, count(*) c from shipments where created_at > now() - interval '7 days' group by quote_job_id having count(*)>1;
