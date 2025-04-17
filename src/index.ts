import puppeteer, { Page } from 'puppeteer';
import notifier from 'node-notifier';
import path from 'path';

const blockedResourceTypes = [
    'image', 'font', 'media'
];

const blockedDomains = [
    'google-analytics', 'googletagmanager', 'doubleclick', 'facebook', 'adservice', 'adsystem'
];

type Room = {
    name: string;
    price: string;
    available: boolean;
};

const url = "https://www.agoda.com/ko-kr/roaders-plus-hotel/hotel/taipei-tw.html?checkIn=2025-10-04&los=4&Rooms=1&Adults=4"

async function checkRooms(page: Page) {
    try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-selenium="MasterRoom"]', { timeout: 60000 });

        const rooms: Room[] = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-selenium="MasterRoom"]')).map(room => {
                const name = room.querySelector('[data-selenium="masterroom-title-name"]')?.textContent?.trim() || '';
                const price = room.querySelector('[data-selenium="PriceDisplay"] strong')?.textContent?.trim() || '';
                const available = !!room.querySelector('[data-selenium="ChildRoomsList-bookButtonInput"]');

                return {
                    name,
                    price,
                    available,
                };
            });
        });

        const familyRooms = rooms.filter(room =>
            room.available &&
            (room.name.toLowerCase().includes('101뷰 패밀리룸') ||
                room.name.toLowerCase().includes('101 view family room'))
        );

        console.log(`[${new Date().toLocaleTimeString()}]`);
        if (familyRooms.length) {
            console.log('✅ 예약 가능한 패밀리룸:');
            familyRooms.forEach(room => {
                console.log(`- ${room.name}`);
                console.log(`  ▸ ${room.price}`);
            });

            notifier.notify({
                title: '✅ Agoda 패밀리룸 알림',
                message: familyRooms[0].name,
                sound: true,
                icon: path.join(__dirname, 'icon.png'),
                wait: false
            });
        } else {
            console.log('❌ 패밀리룸 없음');
        }

        console.log('');

        setTimeout(() => checkRooms(page), 5 * 1000);
    } catch (error) {
        console.error('⚠️ 오류 발생:', error);
        setTimeout(() => checkRooms(page), 5 * 1000);
    }
}

async function scrapeAgodaRooms() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-features=site-per-process',
            '--no-zygote',
            '--single-process'
        ]
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const url = request.url();
        if (
            blockedResourceTypes.includes(request.resourceType()) ||
            blockedDomains.some((domain) => url.includes(domain))
        ) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await checkRooms(page);
    } catch (error) {
        console.error('⚠️ 초기화 오류:', error);
        await browser.close();
    }

    process.on('SIGINT', async () => {
        console.log('\n브라우저 종료 중...');
        await browser.close();
        process.exit();
    });
}

scrapeAgodaRooms();
