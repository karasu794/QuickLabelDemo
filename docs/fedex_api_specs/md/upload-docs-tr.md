# upload-docs-tr

> Source: https://developer.fedex.com/api/tr-tr/catalog/upload-documents/docs.html

                    window.FDX = window.FDX || {}; window.FDX.GDL = window.FDX.GDL || \[\]; var FDX = {}; FDX.contextPath = ""; window.fdx=window.fdx || {}; fdx.context={ envtVar:"", searchUrl:"/services/search", isPublishMode:"true" }; if (!FDX) { var FDX = {}; } FDX.DATALAYER ={}; FDX.GDL = \[\]; FDX.DATALAYER.event=\[\]; FDX.DATALAYER.page = { pageInfo: { pageName: "docs", locale: "tr\_tr", language:"tr", historicalPageName : "", referrer : "", toolUsage:"", viewPort:"", reportSuite:"", region: "meisa", country:"tr", pagePath:"apps\\/fdp\\/catalog\\/upload\\u002Ddocuments\\/docs", securePage : "" }, category: { pageType:"", primaryCategory: "", isApplication:"", appName:"" }, onsiteSearch:{ term:"", suggested: "" }, link:{ data:"", type:"" }, button:{ data:"", type:"" }, assetSearch:{ keyword:"", type:"" } }; let country = "tr"; let language = "tr"; let pagepath = "apps\\/fdp\\/catalog\\/upload\\u002Ddocuments\\/docs"; let hash = window.location.hash; let pageId = country.toUpperCase().concat("/", language).concat("/", pagepath).concat("", hash).replace("#", ""); window.FDX.GDL.push(\[ 'event:publish', \[ 'page', 'pageinfo', { pageId: pageId } \] \]); FDX.DATALAYER.googleAPIFlag=false; FDX.DATALAYER.inputField=''; FDX.DATALAYER.userType=""; FDX.DATALAYER.locationApp = { googleAPIFlag: "", };    (function(g,b,d,f){(function(a,c,d){if(a){var e=b.createElement("style");e.id=c;e.innerHTML=d;a.appendChild(e)}})(b.getElementsByTagName("head")\[0\],"at-body-style",d);setTimeout(function(){var a=b.getElementsByTagName("head")\[0\];if(a){var c=b.getElementById("at-body-style");c&&a.removeChild(c)}},f)})(window,document,"body {opacity: 0 !important}",3E3);  window\['adrum-start-time'\] = new Date().getTime(); (function(config){ config.appKey = $("#templateConfig").val(); config.adrumExtUrlHttp = 'http://cdn.appdynamics.com'; config.adrumExtUrlHttps = 'https://cdn.appdynamics.com'; config.beaconUrlHttp = 'http://pdx-col.eum-appdynamics.com'; config.beaconUrlHttps = 'https://pdx-col.eum-appdynamics.com'; config.xd = {enable : false}; })(window\['adrum-config'\] || (window\['adrum-config'\] = {})); 

true

![Fedex Logo](/api/content/dam/fedex-com/irc/leftnav/white.png)  

         

    

 [![ Kaydolun veya Oturum Açın](/api/content/dam/fedex-com/irc/leftnav/login-icon_white.svg) Kaydolun veya Oturum Açın](#)

* * *

[](https://www.fedex.com/en-us/developer.html)

-   [IRC](/content/fedex-com/irc.html) 
-   [Katalog](https://developer.fedex.com/api/tr-tr/catalog.html) 
-   [Ticaret Belgeleri Yükleme API'si](https://developer.fedex.com/api/tr-tr/catalog/upload-documents.html) 
-   documentation,documentation 

# 

### Giriş

Ticari Belge Yükleme API'si, küresel gönderi ihtiyaçlarınızı sadeleştiren ve uluslararası gönderiler için gerekli gümrük belgelerini elektronik ortamda yüklemenize olanak tanıyan bir belge yükleme çözümüdür. Ticari belgelerinizin çoğunu elektronik ortamda göndererek, ticari belgeleri yazdırma veya gönderiye ekleme zahmetinden kurtulabilirsiniz.

Gümrük ve diğer kurumlar, elektronik ortamda gönderilen belgeleri, gönderinize eklenmiş kağıt nüshalardan daha hızlı alır. Kritik ticari bilgilerin alınması ve paylaşılmasının, gönderi işleminin daha erken evrelerinde yapılması sayesinde, gümrükleme süreci de optimize edilmiş olur.

_Not:_

-   _Bazı durumlarda, belirli uluslararası belgelerin yine de pakete eklenmesi gerekir. Daha fazla bilgi için [İhracat Belgeleri](https://developer.fedex.com/api/tr-tr/guides/api-reference.html#exportdocuments) bölümünü inceleyin._
-   _Gümrükleme sürecinin sorunsuz olmasını sağlamak ve gecikmeleri önlemek için belgelerin görsel olarak net bir biçimde görüldüğünden ve herhangi bir görsel bozukluğunun olmadığından emin olun._

### Ticaret Belgeleri Yükleme API'si Ayrıntıları

Gümrük belgelerinizi yükleyin veya FedEx'in oluşturduğu ticaret belgelerini kullanın. FedEx tarafından oluşturulan elektronik ticaret belgelerini, Şirketinizin Antetli Kağıdını/Logosunu ve Dijital imza görüntüsünü yükleyerek de özelleştirebilirsiniz. Belgelerin elektronik ortamda yüklenmesi her gönderi için gümrük belgelerini el ile imzalama, katlama, doldurma ve ekleme zahmetini ortadan kaldırır. Ayrıca, kağıt, enerji ve baskı masraflarından tasarruf sağlar.

Aşağıdaki özellikler bu API ile ilişkilidir:

**Belge Yükleme**

Bir belgeyi, gönderiyi oluşturmadan önce (gönderi öncesi) veya gönderi oluşturulduktan sonra Gönderi API'sini kullanarak (gönderi sonrası) yükleyebilirsiniz.

_Not: Belgenin genelinde belirtilen gönderi oluşturma, Gönderi API'si - Gönderi Oluşturma, Açık Gönderi API'si - Açık Gönderi Oluşturma ve Freight LTL API'si - Freight LTL Gönderisi uç noktaları için geçerlidir._

**Birden Fazla Belge Yükleme**  

Hem gönderi öncesi hem de gönderi sonrası koşullar için her bir karşıya yükleme talebi başına en fazla beş belge yükleyebilirsiniz.

**Birden Fazla Kodlu Belge Yükleme**  

Gönderiyi oluşturmadan önce (gönderi öncesi) veya gönderi oluşturulduktan sonra (gönderi sonrası) base64 kodlu belgeleri (en fazla beş adet) tek seferde yükleyebilirsiniz. Bu seçenek kullanılarak yüklenen belgeler, olası bir müdahale durumunda belge verilerine ek güvenlik sağlar.

**Karşıya Görüntü Yükleme**  

Bu özellik, FedEx tarafından oluşturulan belge veya raporlarda kullanılabilecek özelleştirilmiş Şirket Antet/Logo ve Dijital imza görsellerini karşıya yüklemenizi sağlar. Önce Şirketin Antet/Logo ve Dijital imza görselini FedEx Sunucularına yükleyin ve sonra _shippingDocumentSpecification_ altından _customerImageUsages_ öğesini kullanarak bu karşıya yükleme referanslarını gönderi talebinizde (Gönderi uç noktası oluştur) her belge için ayrı ayrı sağlayın.

Dijital İmzalar veya Antetli Kağıtlar/Şirket Logoları, FedEx tarafından oluşturulan şu belge ve raporlara basılır:

-   Ticari Fatura
-   Menşe Şahadetnamesi
-   OP900
-   Proforma Fatura
-   USMCA Menşe Şahadetnamesi
-   USMCA Ticari Faturası ve Menşe Şahadetnamesi

_Not:_

-   _Dijital İmza – İmza sınırlaması 240x25 pikseldir ve görseller GIF veya PNG formatında olabilir._
-   _Şirket Anteti/Logosu – Logo sınırlaması 700x50 pikseldir ve görseller GIF veya PNG formatında olabilir._

### Ticari Belge Yükleme API'si İş Akışı

Aşağıda, Gönderi Öncesi veya Gönderi Sonrası senaryolarında bir belge yüklemek için kullanılacak akış sunulmuştur.

**Gönderi Öncesi Belge Karşıya Yükleme:**

Gönderi öncesi belge karşıya yükleme, gönderi oluşturulmadan önce bu API oluşturularak belgelerin karşıya yüklenmesini içerir. Belgeler başarıyla karşıya yüklendikten sonra gönderi talebindeki yüklenmiş belgelerin referansını ilişkilendirebilirsiniz.

Gönderi onaylanmadan önce ticari belgelerinizi karşıya yüklemeniz için standart yöntemdir.

Gönderi öncesi belge karşıya yükleme adımları şöyledir:

-   İhtiyacınıza göre aşağıdaki uç noktalardan herhangi birini kullanın
    -   Belge Yükleme
    -   Birden Fazla Belge Yükleme
    -   Kodlu Belgeleri Yükleme
-   Gönderi Öncesi yükleme olduğunu belirtmek için workflowName değeri olarak ETDPreShipment girin.
-   Karşıya yüklenecek gerçek dosyaları veya base64 kodlu belgeleri sağlayın.  
    
-   Belgeyle ilişkili belge türü ve gönderi üst verileri dahil olmak üzere belge ayrıntılarını (Ticari Fatura, Menşe Şahadetnamesi, İhracat Beyanı vs.) sağlayın.
-   Talebin başarılı olması durumunda, belgeler FedEx sunucularına yüklenir ve başarılı işlem belirteci olarak benzersiz bir tanımlayıcı, yani karşıya yüklenen her bir belge için **_docId_** döndürülür.  
    
-   Gönderi Oluştur/Açık Gönderi Oluştur/LTL Kargo Gönder uç noktasını kullanın.
-   Seçiminiz doğrultusunda Gönderi uç noktasında, shipmentSpecialService/specialServiceTypes öğesini ELECTRONIC\_TRADE\_DOCUMENTS olarak girin ve shipment SpecialServices/etdDetail/attachedDocuments/documentId öğesine _docId_ değerlerini geçirin.
_Not: Çok parçalı gönderiye (MPS) yönelik olarak gönderideki tüm paketler için belgelerin yüklenmesinden oluşturulan **docId** belirtin._-   Gönderi talebinin başarılı olması durumunda, FedEx'e ETD gönderimi onaylanarak takip ve etiket ayrıntıları oluşturulur ve _completedEtdDetail_ nesnesi referans olarak karşıya yüklenen belge türünü ve belgelerin kimliğini getirir.
-   Gönderi öncesi belge karşıya yükleme için, tüm belgeleri teker teker veya en fazla 5 belgeyi birlikte karşıya yükleyebilir ve ardından tüm belge kimliklerini tek seferde gönderiye sağlayabilirsiniz.

**Gönderi Sonrası Belge Yükleme (PSDU):**

Gönderi sonrası belge karşıya yükleme (PSDU), belgeleri gönderi gönderildikten ve takip etiketleri oluşturulduktan sonra karşıya yüklemenize olanak tanır. Bu durumda, gönderi ve takip numarası oluşturulduktan sonra bu takip numarasını belge karşıya yükleme talebiyle ilişkilendirin.

Bu yöntem, Ticari Faturalarını kendileri oluşturan, üçüncü taraflara veya gümrük belgelerini gönderinin bulunduğu yerden farklı bir ofiste hazırlayan müşteriler için kolaylık sağlar.

Bu yöntem kullanılırken şu hususlar göz önünde bulundurulmalıdır:

-   Gönderi takip numaranız ve gönderi tarihiniz yükleme talebinden önce hazır olmalıdır.
-   Belgeyi zamanında göndermek için göndericinin şubesinin son alım zamanlarını bilmeniz gerekir.

Bu API, ilgili gündeki gönderilerin yanı sıra gelecek tarihli gönderiler için gümrük belgeleri oluşturulmasını da destekler.

Gönderi öncesi karşıya yükleme adımları şöyledir:

-   _Gönderi Oluştur/Açık Gönderi Oluştur/Freight LTL Gönder_ uç noktasını kullanın.
-   Gönderi Oluştur uç noktasında, seçiminize uygun olarak aşağıdaki ayrıntıları belirtin,
    -   ELECTRONIC\_TRADE\_DOCUMENTS olarak _shipmentSpecialServices/specialServiceTypes_ sağlayın.
    -   POST\_SHIPMENT\_UPLOAD\_REQUESTED olarak _shipmentSpecialServices/etdDetail/attributes_ sağlayın.
-   Gönderi talebinin başarılı olması durumunda, FedEx'te gönderi onaylanarak takip ve etiket ayrıntıları oluşturulur.
-   İhtiyacınıza göre aşağıdaki uç noktalardan herhangi birini kullanın.
    -   Belge Yükleme
    -   Birden Fazla Belge Yükleme
    -   Birden Fazla Şifreli Belge Yükleme.
-   Gönderi Sonrası yükleme olduğunu belirtmek için _workflowName_ değeri olarak _ETDPostShipment_ girin.
-   Karşıya yüklenecek gerçek dosyaları veya base64 kodlu belgeleri sağlayın.
-   Belge ayrıntılarını (Ticari Fatura, Menşe Şahadetnamesi, İhracat Beyanı vs.) sağlayın.
-   _document/meta/trackingNumber_ ve _document/meta/shipmentDate_ öğesi altından halihazırda işlenmiş gönderi _trackingNumber_ ve _shipmentDate_ bilgilerini sağlayın.  
    _Not: Çok parçalı gönderilere (MPS) yönelik olarak belgeleri yüklerken ana gönderi takip numarasını kullanın. Ana gönderi için sağlanan ETD bilgileri, alt gönderi için de geçerlidir._
-   Talebin başarılı olması durumunda, belgeler FedEx sunucularına yüklenir ve karşıya yüklenen belgeler gönderiyle ilişkilendirilir

Aşağıda, gönderi belgeleriyle ilgili olan belgeleri ve görselleri yüklemenize izin veren Ticaret Belgesi Yükleme API'sinin özellikleri verilmiştir.  

### Ticari Belge Yükleme API'si Nasıl Çalışır?

Aşağıda, gönderi belgeleriyle ilgili olan belgeleri ve görselleri yüklemenize izin veren Ticaret Belgesi Yükleme API'sinin özellikleri verilmiştir.

**Belge Yükleme**  

Bu uç noktayı kullanarak Gönderi öncesi ve Gönderi sonrası koşulları için ticari belge yükleyebilirsiniz.  

Aşağıda bu istekle ilişkili gerekli girdi bilgileri verilmiştir:

-   **Ek** – Yüklenecek asıl dosyadır.
-   **workFlowName** – Gönderi öncesi karşıya yükleme için ETDPreShipment, Gönderi sonrası karşıya yükleme için ise ETDPostShipment sağlayın.
-   **document** – Belge ayrıntılarını ve gönderi üst verilerini sağlayın.
-   **trackingNumber** – Belgelerin yükleneceği PSDU gönderi takip numarasını sağlayın. Gönderi öncesi karşıya yükleme için bu isteğe bağlıdır.
-   **shipmentDate** – Gönderi tarihidir. Gönderi öncesi karşıya yükleme için bu isteğe bağlıdır.

Gönderi öncesi karşıya yükleme için başarılı yanıt verilmesi durumunda, belgeler FedEx Sunucularına yüklenir ve _docId_ verilir. Bu _docId_, asıl gönderide gönderiyi göndermek ve etiket oluşturmak için kullanılır.

Gönderi sonrası karşıya yükleme için başarılı yanıt verilmesi durumunda, belgeler FedEx Sunucularına yüklenir ve karşıya yüklenen belgeler zaten doğrulanmış olan gönderiyle ilişkilendirilir.

**Görüntü Yükleme**  

Bu uç noktayı kullanarak, gönderi belgelerine uygulanabilecek özel imza ve antet görselleri/şirket logosu yükleyebilirsiniz.  

Aşağıda bu istekle ilişkili gerekli girdi bilgileri verilmiştir:

-   **attachment** – Görsel dosyasıdır.
-   **document** – Dosya adı, içerik türü ve dosya üst verileri gibi görüntü ayrıntılarını belirtin.

Talebin başarılı olması durumunda, imza ve antet görselleri/Şirket Logosu FedEx Sunucularına yüklenir ve _imageIndex_ döndürülür. Ardından bu dizin, özel görsel veya antetin gönderi belgesine basılmasını sağlamak için _shippingDocumentSpecification_ altında _customerImageUsages_ tekil belge öğesi için gönderi talebinize iletilir.

### Birden Fazla Belge Yükleme

Bu uç noktayı kullanarak gönderi öncesi ve gönderi sonrası koşulları için ticari belge (en fazla beş tane) yükleyebilirsiniz. Aşağıda bu istekle ilişkili gerekli girdi bilgileri verilmiştir:

-   **workflowName** – Gönderi öncesi karşıya yükleme için _ETDPreShipment_, gönderi sonrası karşıya yükleme için ise _ETDPostShipment_ sağlayın.
-   **fileName** – Güncellenmekte olan belgelerin veya dosyaların adlarını uzantı türüyle birlikte girin. Örnek: COD.PDF
-   **contentType** – Karşıya yüklenecek dosya türünü ve biçimini mevcut seçenekler arasından seçin.
-   **shipDocumentType** – Yüklenecek belge türlerini belirtin.
    
    Her bir belge hakkında daha fazla bilgi için bu sayfadaki [Belge Yükle](#updoc) bölümüne bakın. Seçebileceğiniz belge türlerinin listesi şu şekildedir:
    
    -   CERTIFICATE\_OF\_ORIGIN COMMERCIAL\_INVOICE
    -   ETD\_LABEL
    -   USMCA\_CERTIFICATION\_OF\_ORIGIN
    -   USMCA\_COMMERCIAL\_INVOICE\_CERTIFICATION\_OF\_ORIGIN
    -   DİĞER
    -   PRO\_FORMA\_INVOICE
-   **carrierCode** – FedEx işletme sermayeli şirketinin dört harfli kodunu sağlayın. Örnek: FDXE
-   **originCountryCode** – Gönderi için menşe ülkesi kodunu verir.
-   **destinationCountryCode** – Gönderi için varış yeri ülkesi kodunu verir.
_Not: Ülke kodunuzu öğrenmek için [_Referans Kılavuzuna_](https://developertest.fedex.com/api/en-us/guides/api-reference.html#countrycodes) başvurun. Örnek: ABD_-   **shipmentDate** – Gönderi sonrası karşıya yükleme için gerçek gönderi tarihini girin.
-   **trackingNumber** – Gönderi sonrası karşıya yükleme için gönderi takip numarasını girin. Örnek: 7825XXXXXXX.

Gönderi öncesi karşıya yükleme için başarılı yanıt verilmesi durumunda, belgeler FedEx Sunucularına yüklenir ve belge numaraları _(docId)_ getirilir. Bu _docId_, asıl gönderide gönderiyi göndermek ve etiket oluşturmak için kullanılır.

Gönderi sonrası karşıya yükleme için başarılı yanıt verilmesi durumunda, belgeler FedEx Sunucularına yüklenir ve karşıya yüklenen belgeler zaten doğrulanmış olan gönderiyle ilişkilendirilir.

### Birden Fazla Şifreli Belge Yükleme

Bu uç noktayı kullanarak gönderi öncesi ve gönderi sonrası koşulları için base64 kodlu ticari belgeler (en fazla beş tane) yükleyebilirsiniz.

Aşağıda bu istekle ilişkili gerekli girdi bilgileri verilmiştir:

-   **workFlowName** – Gönderi öncesi karşıya yükleme için _ETDPreShipment_, Gönderi sonrası karşıya yükleme için ise _ETDPostShipment_ sağlayın.
-   **carrierCode** – FedEx işletme sermayeli şirketinin dört harfli kodunu sağlayın. Örnek: FDXE
-   **contentType** – Karşıya yüklenecek dosya türünü ve biçimini mevcut seçenekler arasından seçin.
-   **shipDocumentType** – Yüklenecek belge türlerini belirtir.
    
    Her bir belge hakkında daha fazla bilgi için bu sayfadaki [Belge Yükle](#updoc) bölümüne bakın. Seçebileceğiniz belge türlerinin listesi şu şekildedir:
    
    -   CERTIFICATE\_OF\_ORIGIN COMMERCIAL\_INVOICE
    -   ETD\_LABEL
    -   USMCA\_CERTIFICATION\_OF\_ORIGIN
    -   USMCA\_COMMERCIAL\_INVOICE\_CERTIFICATION\_OF\_ORIGIN
    -   DİĞER
    -   PRO\_FORMA\_INVOICE
-   **originCountryCode** – Gönderi için menşe ülkesi kodunu verir.
-   **destinationCountryCode** – Gönderi için varış yeri ülkesi kodunu verir.
_Not: Ülke kodunuzu öğrenmek için [_Referans Kılavuzuna_](https://developertest.fedex.com/api/en-us/guides/api-reference.html#countrycodes) başvurun. Örnek: ABD_-   **fileContentBase64** – Yüklenecek base64 dosyası için bayt kodu içeriğini belirtin.

Gönderi öncesi karşıya yükleme için başarılı yanıt verilmesi durumunda, kodlu belgeler FedEx Sunucularına yüklenir ve belge numaraları _(docId)_ getirilir. Bu _docId_, asıl gönderide gönderiyi göndermek ve etiket oluşturmak için kullanılır.

Gönderi sonrası karşıya yükleme için başarılı yanıt, kodlanmış belgeleri FedEx Sunucularına yükleyecek ve karşıya yüklenen belgeleri halihazırda onaylanmış gönderi ile ilişkilendirecektir.

### Belge Yükleme

Bu API ile gönderilebilecek belgeler şunlardır:  

**Menşe Şahadetnamesi (COO)**  

COO, bir ürünün üretildiği ülkeyi/bölgeyi doğrulayan uluslararası bir belgedir. Bazı ülkeler belirli ülkelerden ithalatı kısıtlar, birçok ülke ithal ürünlerin miktarını sınırlandırır ve bazı ülkeler belirli ülkelerde üretilen ürünlere öncelik verir.  

**Ticari Fatura (CI)**  

Bu, gönderi işlemine dahil olan tarafları ve nakliye edilen ürünleri tanımlayan ve satıcı/ihracatçı tarafından sunulan bir belgedir. Gümrüklerin istediği temel belgedir. Mümkünse ürünlerin ihraç edildiği ülkenin/bölgenin resmi dili kullanılarak hazırlanmalıdır. Ticari Faturada, gönderide yer alan tüm ürünlerin şunları içeren ayrıntılı bir dökümü bulunmalıdır: ürünlerin düzgün tanımları (Nedir? Hangi materyallerden imal edilmiştir? Kullanım amacı nedir?), miktarı, üretildiği ülke/bölge, bedeli veya maliyeti, kullanılan para birimi, her ürünün GTİP numarası ve teslimat şartları. Bazı ülkeler, faturanın aslının göndericinin antetli kağıdında düzenlenmesini zorunlu tutar. Fatura daima ihracatçı tarafından imzalanmalı ve tarihlendirilmelidir. Sunulan bilgilerin, Ticari Faturadaki içeriklerin doğru ve gerçek temsilleri olduğu onaylanmalıdır.  

Daha fazla bilgi için [Global Trade Manager](https://www.fedex.com/GTM)'ımızı ziyaret edin.

**ETD ETİKETİ**

Gönderi Sonrası belge karşıya yükleme kriterleriyle ETD özel hizmetli Gönderide oluşturulan Gönderi etiketidir. Bu etiket, başka belgelerin yanı sıra gönderiyle birlikte de karşıya yüklenebilir.

**Proforma Fatura**

Proforma fatura, satış gerçekleşmeden önce çıkarılır. Proforma fatura tedarikçiden alındıktan sonra alıcı tedarikçiye bir satın alma emri gönderir veya akreditif açar. Satıcı, üzerinde anlaşılan gönderi tarihine uygun olarak malların gönderimini düzenler.

**USMCA Ticari Faturası ve Menşe Şahadetnamesi**

USMCA Menşe Şahadetnamesi (COO), üçlü AMERİKA BİRLEŞİK DEVLETLERİ-MEKSİKA-KANADA SÖZLEŞMESİ (USMCA/T-MEC/CUSMA) katılımcılarından (Kanada, Meksika ve ABD) birinin bir ürünü olarak düşük veya gümrüksüz girişe uygun olan mallar için gereklidir. Menşe şahadetnamesi, malların ihracatçısı veya üreticisi tarafından tamamlanır.

**USMCA Menşe Şahadetnamesi**

USMCA Ticari Faturası ve Menşe Şahadetnamesi (COO), üçlü AMERİKA BİRLEŞİK DEVLETLERİ-MEKSİKA-KANADA SÖZLEŞMESİ (USMCA/T-MEC/CUSMA) katılımcılarından (Kanada, Meksika ve ABD) birinin bir ürünü olarak düşük veya gümrüksüz girişe uygun olan mallar için gereklidir. Menşe şahadetnamesi, malların ihracatçısı veya üreticisi tarafından tamamlanır ve Ticari Faturayla birlikte sunulur.

**Diğer**

Aşağıdaki bölümlerde, diğer belgelerin altında sınıflandırılan bazı yaygın belgeler açıklanmıştır. Gönderi için bu belgelerin karşıya yüklenmesi zorunlu değildir, ancak bir gönderinizin gümrüklenmesi için gerekli olabilir. Bu durum, gönderi türü, çıkış yeri, varış yeri ve başka etkenlere bağlı olarak değişebilir.

-   **Çeki Listesi**

Bir havayolu konşimentosu kapsamında birden fazla paketin bulunması veya gönderi ağırlığının 100 kg'dan fazla olması durumunda Çeki Listesi gereklidir. Bu gerekliliğin gönderilen ürünlere bağlı olarak pazarlar arasında farklılık gösterebileceğini göz önünde bulundurun. Listede ürünler, ürünlerin miktarı ve ağırlığı doğru ve açık bir şekilde tanımlanmalıdır.

-   **Zararlı Parazitlere Neden Olabilecek Radyo Frekans Cihazlarının İthalatına İlişkin FCC 740 Bildirimi**

Zararlı girişimlere yol açabilen radyo frekans cihazlarına sahip elektronik cihazlar gönderilirken Federal İletişim Komisyonu (FCC) 740 sayılı formu gereklidir. Bu formda, Cihaz Modeli/Tür Adı, Uyumlu Tarife Numarası, Üreticinin Adı ve Adresi, Alıcının Adı ve Adresi ile İthalatçının Adı ve Adresi yer alır.

-   **Video-Film Beyanı**

Video filmi beyanı: Bu belge, gönderilen filmin/videonun müstehcen veya ahlaka aykırı bir öğe ya da Amerika Birleşik Devletleri'ne karşı isyanı savunan herhangi bir husus içermemektedir. Belgede, Film/Video Uzunluğu, Film/Video Süresi ve İçeriğin Kısa Konusu gibi ayrıntılar yer alır.

_Feragatname: Yukarıdaki bilgiler değiştirilebilir._

Diğer belgeler yalnızca ülkelere, ürünlere ve başka özel gümrük belgelerine bağlı olarak yüklenir. Yaygın olarak kullanılan diğer belgelerin listesini görüntülemek için [İhracat Belgeleri](https://developer.fedex.com/api/tr-tr/guides/api-reference.html#exportdocuments)'ne tıklayın.

### Gümrük Belgeleri ve Gereksinimleri

Doğru belgeleme, yurt içi ve yurt dışı gönderilerin önemli bir unsurudur. Her ülkenin uluslararası gönderilere ilişkin özel yasa ve yönetmelikleri vardır. ABD ihracat gönderileri için ABD ve hedef ülkeler farklı düzenleyici belgeler gerektirir.

_Not: FedEx Uluslararası Havayolu Konşimentosu, FedEx Uluslararası Bir Sonraki Uçuş Havayolu Konşimentosu veya FedEx Uluslararası Posta Hizmeti Havayolu Konşimentosuna ek dokümantasyonun (ör. bir Ticari Fatura) gerekli olduğu gönderiler için ek teslimat süresi gerekebilir._

**Kontrollü Ürünler**

Aşağıdaki ürünleri ülkeler arasında gönderirken, bunların hedef ülke ve şehre teslimat için seçtiğiniz FedEx hizmeti tarafından kabul edildiğinden emin olun.

-   Tehlikeli Maddeler
-   Uluslararası Silah Kaçakçılığı Yönetmelikleri (ITAR)
-   Beklenen Miktarlarda Tehlikeli Maddeler.  
    _Not: Beklenen Miktarlarda Tehlikeli Madde göndermek için SMALL\_QUANTITY\_EXCEPTION özel hizmetler seçeneğini kullanın._
-   İstisnai Radyoaktif Madde Paketi

__Feragatname: Yukarıdaki bilgiler değiştirilebilir ve daha fazla bilgi için [Hizmet Kılavuzu](https://www.fedex.com/en-us/service-guide.html)'na girin veya FedEx temsilcinizle görüşün.__

**Kanada'dan uluslararası giden gönderiler için ihracat beyanı**

Kanada'dan yapılan ihracatların bildirimi için, aşağıdaki koşullarda Kanada Sınır Hizmetleri Ajansı'na (CBSA) ihracat beyanı sunulmalıdır.

-   Yasaklamaya tabi olmayan malları içeren Kanada'dan tüm uluslararası giden gönderiler, ticari malların değeri 2.000 Kanada Doları veya üzerinde olduğunda ve malların varış yeri Amerika Birleşik Devletleri, Porto Riko veya Birleşik Devletler Virjin Adaları dışında bir yer olduğunda.
-   Değeri fark etmeksizin kontrole tabi, yasaklı veya düzenlemeye tabi malları içeren Kanada'dan tüm uluslararası giden gönderiler.

Taşıyıcılar, herhangi bir mal Kanada'dan çıkmadan önce ihracatçıdan rapor belge numarasını almalıdır. İhracatçı, rapor belge numarasını taşıyıcıya vermeden önce ihracat beyanını ibraz etmelidir.

**Elektronik İhracat Bilgileri (EEI)**

EEI, Otomatik Ticaret Ortamı'nda (ACE) bulunan AESDirect kullanılarak Otomatik İhracat Sistemi (AES) üzerinde oluşturulan elektronik ihracat bilgileridir. ACE Güvenli Veri Portalı (ACE Portalı), ticaret yetkililerinin ABD Gümrük ve Sınır Koruma İdaresi (CBP) ile iletişim kurması için merkezi bir erişim noktasıdır.

EEI, artık ABD hükümetine gönderilemeyen Gönderici İhracat Beyanı (SED), Ticaret Bakanlığı (Nüfus Sayım İdaresi) 7525-V sayılı formunun elektronik versiyonudur. EEI, bir uluslararası gönderi işleminin ilgili tüm ihracat verilerini bildirerek ihracat istatistikleri ve kontrolü sağlar.

EEI'nin Ticaret Kontrol Listesinde (CCL) listelenen mallar için ihracatçı veya aracı tarafından bilgilerin Otomatik İhracat Sistemi (AES) üzerinden elektronik olarak ibraz edilmesi zorunludur.

Gönderinin değerine bakılmaksızın, gönderinin çıkış yeri ABD, ABD Virgin Adaları veya Porto Riko, varış yeri Çin, Rusya, Venezüela veya Hong Kong ise şu bilgileri sağlamanız gereklidir:

-   Dahili İşlem Numarası'nın (ITN) yer aldığı bir EEI
-   Her bir öğe için doğru İhracat Kontrol Sınıflandırma Numarası (ECCN) veya EAR99 sınıflandırma numarası veya
-   Geçerli bir dosya hazırlama muafiyeti

Aşağıdaki durumlarda muafiyetlere izin verilir:

-   Gönderinin Lisans Muafiyeti GOV için uygun olması
-   Gönderinin İhracat Yönetimi Yönetmelikleri ve Dış Ticaret Mevzuatı (FTR) kapsamındaki istisnalar için uygun olması veya
-   Gönderinin EAR99 olarak sınıflandırılan öğelerden oluşması

__Not: Diğer varış noktaları için, herhangi bir gündeki konsolide gönderide bir veya daha fazla ürünün (Ek B sayısı) toplam değerinin 2.500 Amerikan dolarından fazla olması durumunda, tüm ABD ihracat gönderileri için EEI sunmanız gereklidir.__

**Göndericinin Talimat Yazısı (SLI)**

SLI'de ABD'deki müşteriler için uluslararası gönderi bilgileri yer alır.

__Not:__

_-   _Aracılık dahil hizmetimizle Kanada'ya yapılan gönderilere gümrükleme dahildir. Bir ücret uygulanır. Aracılık dahil hizmet, tüm elektronik gönderi çözümleriyle kullanılabilir olmayabilir.__

FedEx International Ground® koli dağıtım hizmeti, FedEx Ground® hizmetinin FedEx International Ground® gönderilerini tek bir aracı giriş _ücretiyle_ tek bir gümrük girdisi olarak gümrüklenen ve işlenen tek bir birim haline getirmesine olanak tanır.

### Ticari Belge Yükleme API'si Faydaları

Ticari Belge Yükleme API'sinin/Özelliğinin bazı faydaları şunlardır:

-   Gümrükleme sorunlarının daha az olması, gümrük gecikmelerini azaltır ve böylece gönderilerin güvenilirliği ve satıcının itibarı artar.
-   İşin oluşturulması için daha zaman kalması, birden fazla belge nüshasını ayrı ayrı paketlerle eşleştirme ihtiyacını ortadan kaldırarak şirketin üretkenliğini ve kârını artırır.
-   FedEx tarafından oluşturulan Ticari Fatura veya Geçici Faturaya şirkete ait antetli kağıt ve imza görüntüsü eklenmesine olanak tanır.
-   Bilgilerin eksik olması gibi gümrük belgeleriyle ilgili sorunları çözmek için gönderi varmadan önce ek süre kazanılmasını sağlar.
-   Kanada'ya gönderilen FedEx International Ground® gönderilerine yönelik olarak ticari faturanızın elektronik olarak gönderilmesini sağlar.
-   Gelecekte planlanan bir gün gönderilecek olan paketler veya bugünden itibaren önümüzdeki 10 gün içinde yapılacak gönderiler için gümrük belgelerini FedEx'e gönderilmesini sağlar.
-   Faturanın paket üzerinde olmaması sayesinde ürün bilgilerinin üçüncü taraflarca görülmemesiyle daha fazla rahatlık sağlar.
-   Kağıt, toner, gönderim materyalleri ve yazıcı kullanımını azaltarak karbon ayak izini azaltır.
-   Paket üzerinde fatura olmadığı ve ürün bilgileri üçüncü taraflara açıklanmadığı için gönderinizin daha güvende olmasını sağlar.
-   Uluslararası gönderi yaptığınızda zamandan tasarruf etmenizi sağlar ve hataları azaltır.
-   Bu belge karşıya yükleme özelliği, hem ithalat, hem de ihracat gönderileri için kullanılabilir. Paketlerinizi gönderdiğiniz/aldığınız ülkelerde belgelerin karşıya yüklenmesinin kabul edilip edilmediğini görmek için [kullanılabilir ülkelerin listesini](https://www.fedex.com/content/dam/fedex/us-united-states/services/Commercial_Invoice_Country_List.pdf) görüntüleyin.
-   FedEx Belge Hazırlama Merkezi ve [Uluslararası Belge Yardımı bölümü](https://www.fedex.com/GTM) ile karşıya yüklenen belgeleri çevrimiçi olarak hazırlayabilir, saklayabilir ve yeniden kullanabilirsiniz.

### **İş Kuralları**

Belge Yükleme API'si/Özelliği ile ilişkili bazı önemli iş kuralları şunlardır:

-   Belge yüklemek için geçerli dosya türleri PDF, TXT, PNG, JPG, GIF, BMP, TIF, RTF, DOC, DOCX, XLS ve XLSX'dir.
-   Belgeler gönderilmeden en fazla 10 gün önce karşıya yüklenebilir.
-   Yüklenen ticari belge veya görsellerin her biri en fazla 5 MB boyutunda olabilir.
-   Dijital İmza görselinin boyut sınırı 240x25 pikseldir ve görseller GIF veya PNG formatında olabilir.
-   Şirket Anteti/Logosu için boyut sınırı 700x50 pikseldir ve görseller GIF veya PNG formatında olabilir.
-   Antetli kağıt görseli gümrük düzenlemelerine göre tüm çıkış/varış şubeleri için kabul edilmeyebilir.
-   Görseller karşıya olduğu gibi yüklenir ve FedEx tarafından herhangi bir düzeltme yapılmaz.
-   Gümrük belgeleri, şu özel işleme ve hizmet seçenekleriyle elektronik ortamda yüklenebilir:
    -   Kuru Buz
    -   Tehlikeli Maddeler
    -   Tehlikeli Madde
-   Çıkış yeri Amerika Birleşik Devletleri (ABD), Asya Pasifik, Kanada (CA) ve Karşıya Yüklemenin etkinleştirildiği Avrupa Birliği (AB) ülkeleri olan TPC (Üçüncü Parti Alıcı) gönderileri için zorunludur.
-   Elektronik belgelerle yapılan tüm gönderilerin, talep edilen gönderi tarihinde oluşturulması, karşıya yüklenmesi ve alınması gereklidir.
-   PSDU (Gönderi Sonrası Belge Karşıya Yükleme) kullanırken, belgeyi/belgeleri paketin alınmasından önce karşıya yüklediğinizden emin olun.

     

CLOSE ![](/api/content/dam/fedex-com/irc/tryout/close.svg)

-   Request
-   Response

Payload:

Header Parameters

[EDIT HEADER](#)

* * *

[RESET](#) [SAVE](#)

Query Parameters

Path Parameters

Body

SEND

Response

Copy

OTURUM AÇ

PAROLANIZI YA DA KULLANICI KİMLİĞİNİZİ Mİ UNUTTUNUZ?

* * *

Bir kullanıcı kimliği oluşturarak FedEx API'lerine erişebilirsiniz.

KAYDOL

  

 

-   Web Hizmetleri veya FedEx Ship Manager Server Müşterisi misiniz? Öyleyse [Geliştirici Kaynak Merkezine](https://www.fedex.com/en-us/developer.html "DRC") hâlâ erişebilirsiniz.
    
-   © FedEx Corporate Services Inc. Tüm hakları saklıdır.

-   [Entegrasyon Çözümleri](https://www.fedex.com/en-us/integration.html)
-   [Destek](https://www.fedex.com/en-us/integration/support.html)
-   [FedEx.com](https://www.fedex.com/en-us/home.html)
-   [Kullanım Koşulları](https://www.fedex.com/en-us/terms-of-use.html)
-   [Gizlilik Politikası](https://www.fedex.com/en-us/trust-center.html)

-   ![](/api/content/dam/fedex-com/irc/leftnav/globe.png)
-   Turkey-   Turkish
    
    -   [English](https://developer.fedex.com/api/en-tr/catalog/upload-documents/docs.html)
    -   [Turkish](https://developer.fedex.com/api/tr-tr/catalog/upload-documents/docs.html)