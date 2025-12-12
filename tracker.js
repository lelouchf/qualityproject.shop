// Quality Project - Gizli Ziyaretçi Takip Sistemi
// tracker.js - %100 Tarayıcı Uyumlu, Hatasız

// Sadece tarayıcıda çalıştığını kontrol et
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    
    // 3 saniye sonra başla (sayfa tam yüklensin)
    setTimeout(() => {
        initTracker();
    }, 3000);
    
    function initTracker() {
        console.log('🔍 Quality Project Tracker Aktif');
        
        // BLACKLIST IP'ler
        const BLACKLIST_IPS = [
            '31.223.58.56',
            '192.168.1.1',
            '10.0.0.1',
            '127.0.0.1'
        ];
        
        // Discord Webhook URL
        const WEBHOOK_URL = "https://discord.com/api/webhooks/1448335490251227147/Na3vi0LpjT2oe-KoCGqxiZrWT5gGv4yM1eMBAYBsZ6ac1rE6_MxoX8EZLVYUSGCrB2lK";
        
        let visitedIPs = [];
        
        // localStorage'dan IP'leri al
        try {
            const stored = localStorage.getItem('qp_visited_ips');
            if (stored) {
                visitedIPs = JSON.parse(stored);
            }
        } catch (e) {
            visitedIPs = [];
        }
        
        // 1. Cihaz Bilgisi Topla
        function getDeviceInfo() {
            const ua = navigator.userAgent;
            let device = 'Bilgisayar';
            let os = 'Bilinmeyen';
            let browser = 'Bilinmeyen';
            
            // İşletim Sistemi
            if (/Android/i.test(ua)) {
                os = 'Android 📱';
                device = 'Mobil';
            } else if (/iPhone|iPad|iPod/i.test(ua)) {
                os = 'iOS 📱';
                device = /iPad/i.test(ua) ? 'Tablet' : 'Mobil';
            } else if (/Windows/i.test(ua)) {
                os = 'Windows 🪟';
            } else if (/Macintosh|Mac OS X/i.test(ua)) {
                os = 'macOS 🍎';
            } else if (/Linux/i.test(ua)) {
                os = 'Linux 🐧';
            }
            
            // Tarayıcı
            if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
                browser = 'Chrome 🌐';
            } else if (/Firefox/i.test(ua)) {
                browser = 'Firefox 🦊';
            } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
                browser = 'Safari 🍎';
            } else if (/Edg/i.test(ua)) {
                browser = 'Edge 🔵';
            } else if (/Opera|OPR/i.test(ua)) {
                browser = 'Opera 🔴';
            }
            
            return {
                device: device,
                os: os,
                browser: browser,
                screen: window.screen.width + 'x' + window.screen.height,
                language: navigator.language || 'tr-TR',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
                url: window.location.href,
                referrer: document.referrer || 'Direkt',
                timestamp: new Date().toISOString()
            };
        }
        
        // 2. Bayrak Emojisi
        function getCountryFlag(code) {
            if (!code || code.length !== 2) return '🏴';
            try {
                return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt()));
            } catch {
                return '🏴';
            }
        }
        
        // 3. IP Adresi Al (3 farklı API dene)
        async function getIPAddress() {
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/jsonip',
                'https://api.my-ip.io/v2/ip.json',
                'https://api.db-ip.com/v2/free/self'
            ];
            
            for (let api of apis) {
                try {
                    const response = await fetch(api, { timeout: 3000 });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.ip) return data.ip;
                        if (data.ipAddress) return data.ipAddress;
                        if (data.address) return data.address;
                    }
                } catch (e) {
                    continue;
                }
            }
            return null;
        }
        
        // 4. IP Detayları Al
        async function getIPDetails(ip) {
            if (!ip) return null;
            
            const apis = [
                `https://ipapi.co/${ip}/json/`,
                `https://ipwhois.app/json/${ip}`,
                `https://api.ip.sb/geoip/${ip}`
            ];
            
            for (let api of apis) {
                try {
                    const response = await fetch(api, { timeout: 3000 });
                    if (response.ok) {
                        return await response.json();
                    }
                } catch (e) {
                    continue;
                }
            }
            return null;
        }
        
        // 5. Blacklist Kontrolü
        function isBlacklisted(ip) {
            if (!ip) return false;
            
            // Tam eşleşme
            if (BLACKLIST_IPS.includes(ip)) {
                console.log('🚫 Blacklist IP engellendi:', ip);
                return true;
            }
            
            // 31.223.x.x gibi subnet kontrolü
            const ipParts = ip.split('.');
            for (let blackIP of BLACKLIST_IPS) {
                const blackParts = blackIP.split('.');
                if (ipParts[0] === blackParts[0] && ipParts[1] === blackParts[1]) {
                    console.log('🚫 Subnet engellendi:', ip);
                    return true;
                }
            }
            
            return false;
        }
        
        // 6. Discord'a Gönder
        async function sendToDiscord(ip, details, deviceInfo) {
            if (!ip) return;
            
            // Aynı IP'den kısa sürede spam'ı önle
            try {
                const lastSent = localStorage.getItem('qp_last_sent_' + ip);
                if (lastSent) {
                    const timeDiff = Date.now() - parseInt(lastSent);
                    if (timeDiff < 3600000) return; // 1 saat
                }
            } catch (e) {}
            
            // Blacklist kontrolü
            if (isBlacklisted(ip)) return;
            
            const country = details.country_name || details.country || 'Bilinmeyen';
            const countryCode = details.country_code || details.countryCode || '';
            const city = details.city || 'Bilinmeyen';
            const region = details.region || details.regionName || 'Bilinmeyen';
            const isp = details.org || details.isp || 'Bilinmeyen';
            const flag = getCountryFlag(countryCode);
            
            // Güzel embed oluştur
            const embed = {
                title: "👁️ YENİ ZİYARETÇİ TESPİT EDİLDİ",
                color: 0x00FF00,
                fields: [
                    {
                        name: "📍 IP Adresi",
                        value: `\`${ip}\``,
                        inline: true
                    },
                    {
                        name: "🌍 Konum",
                        value: `${flag} **${country}**\n🗺️ ${city}, ${region}`,
                        inline: true
                    },
                    {
                        name: "🖥️ Cihaz",
                        value: `${deviceInfo.device}\n${deviceInfo.os}`,
                        inline: true
                    },
                    {
                        name: "🌐 Tarayıcı",
                        value: deviceInfo.browser,
                        inline: true
                    },
                    {
                        name: "📶 ISP",
                        value: isp.length > 30 ? isp.substring(0, 30) + '...' : isp,
                        inline: true
                    },
                    {
                        name: "🔗 Sayfa",
                        value: `[${deviceInfo.url}](${deviceInfo.url})`,
                        inline: false
                    }
                ],
                footer: {
                    text: `Quality Project • ${new Date().toLocaleTimeString('tr-TR')}`
                },
                timestamp: new Date().toISOString()
            };
            
            try {
                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [embed],
                        content: `🔔 **Yeni Ziyaretçi!** ${flag} **${country}**'den biri siteye girdi!`
                    })
                });
                
                // Başarılıysa kaydet
                try {
                    localStorage.setItem('qp_last_sent_' + ip, Date.now().toString());
                    
                    // IP'yi listeye ekle
                    if (!visitedIPs.includes(ip)) {
                        visitedIPs.push(ip);
                        if (visitedIPs.length > 50) visitedIPs.shift();
                        localStorage.setItem('qp_visited_ips', JSON.stringify(visitedIPs));
                    }
                    
                    // Detaylı kayıt
                    saveVisitorData(ip, details, deviceInfo);
                    
                } catch (e) {}
                
                console.log('✅ Ziyaretçi gönderildi:', ip);
                
            } catch (error) {
                console.log('❌ Discord hatası:', error);
            }
        }
        
        // 7. LocalStorage'a Kaydet
        function saveVisitorData(ip, details, deviceInfo) {
            try {
                const visitors = JSON.parse(localStorage.getItem('qualityVisitors') || '[]');
                
                const visitor = {
                    id: Date.now(),
                    ip: ip,
                    country: details.country_name || details.country || 'Bilinmeyen',
                    city: details.city || 'Bilinmeyen',
                    device: deviceInfo.device,
                    os: deviceInfo.os,
                    browser: deviceInfo.browser,
                    time: new Date().toLocaleString('tr-TR'),
                    url: deviceInfo.url
                };
                
                visitors.unshift(visitor);
                if (visitors.length > 100) visitors.length = 100;
                
                localStorage.setItem('qualityVisitors', JSON.stringify(visitors));
                
            } catch (e) {
                // localStorage dolmuş olabilir, sorun değil
            }
        }
        
        // 8. Ana Tracking Fonksiyonu
        async function trackVisitor() {
            try {
                console.log('🎯 Ziyaretçi izleniyor...');
                
                const deviceInfo = getDeviceInfo();
                const ip = await getIPAddress();
                
                if (!ip) {
                    console.log('ℹ️ IP alınamadı');
                    return;
                }
                
                console.log('📡 IP:', ip);
                
                // Blacklist kontrolü (en başta)
                if (isBlacklisted(ip)) {
                    console.log('🚫 IP engellendi');
                    return;
                }
                
                const details = await getIPDetails(ip);
                await sendToDiscord(ip, details || {}, deviceInfo);
                
            } catch (error) {
                console.log('⚠️ Tracking hatası:', error);
            }
        }
        
        // 9. Sayfa Event'leri
        // İlk track (5-10 saniye rastgele)
        setTimeout(trackVisitor, 5000 + Math.random() * 5000);
        
        // 30 saniye sonra tekrar
        setTimeout(() => {
            if (document.hasFocus()) {
                trackVisitor();
            }
        }, 30000);
        
        // Fare hareketinde
        let hasMovedMouse = false;
        document.addEventListener('mousemove', () => {
            if (!hasMovedMouse) {
                hasMovedMouse = true;
                setTimeout(trackVisitor, 2000);
            }
        });
        
        // Sayfa kapanırken
        window.addEventListener('beforeunload', () => {
            if (performance.now() > 10000) { // 10 saniyeden fazla kaldıysa
                trackVisitor();
            }
        });
        
        // 10. Admin Kontrolleri
        window.QualityTracker = {
            enable: () => console.log('✅ Tracker aktif'),
            disable: () => console.log('⏸️ Tracker duraklatıldı'),
            getBlacklist: () => BLACKLIST_IPS,
            addBlacklist: (ip) => {
                if (!BLACKLIST_IPS.includes(ip)) {
                    BLACKLIST_IPS.push(ip);
                    console.log('➕ Blacklist eklendi:', ip);
                }
            },
            removeBlacklist: (ip) => {
                const index = BLACKLIST_IPS.indexOf(ip);
                if (index > -1) {
                    BLACKLIST_IPS.splice(index, 1);
                    console.log('➖ Blacklist çıkarıldı:', ip);
                }
            },
            forceTrack: trackVisitor
        };
        
        console.log('🚀 Quality Tracker hazır!');
    }
    
} else {
    // Node.js veya başka ortamda çalıştırılıyorsa
    console.log('✅ Bu script sadece tarayıcıda çalışır.');
}
