import Script from 'next/script';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export default async function MarketingScripts() {
    let pixelId = '';
    let gtmId = '';
    let ga4Id = '';

    try {
        await connectToDatabase();
        const setting = await Settings.findOne({ key: 'marketing' });
        if (setting?.value) {
            pixelId = setting.value.pixelId || '';
            gtmId = setting.value.gtmId || '';
            ga4Id = setting.value.ga4Id || '';
        }
    } catch (e) {
        console.error('Failed to load marketing settings', e);
    }

    return (
        <>
            {/* Google Tag Manager */}
            {gtmId && (
                <Script id="google-tag-manager" strategy="afterInteractive">
                    {`
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${gtmId}');
                    `}
                </Script>
            )}

            {/* Google Analytics 4 */}
            {ga4Id && (
                <>
                    <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
                    <Script id="google-analytics" strategy="afterInteractive">
                        {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${ga4Id}');
                        `}
                    </Script>
                </>
            )}

            {/* Meta Pixel */}
            {pixelId && (
                <Script id="meta-pixel" strategy="afterInteractive">
                    {`
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${pixelId}');
                    fbq('track', 'PageView');
                    `}
                </Script>
            )}
        </>
    );
}

export async function GTMNoScript() {
    let gtmId = '';
    try {
        await connectToDatabase();
        const setting = await Settings.findOne({ key: 'marketing' });
        if (setting?.value?.gtmId) {
            gtmId = setting.value.gtmId;
        }
    } catch {
        // ignore
    }

    if (!gtmId) return null;

    return (
        <noscript>
            <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
            />
        </noscript>
    );
}
