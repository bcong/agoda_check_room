import puppeteer, { Page } from 'puppeteer';
import notifier from 'node-notifier';

type Room = {
    name: string;
    price: string;
    available: boolean;
};

const blockedResourceTypes = [
    'image', 'font', 'media'
];

const blockedDomains = [
    'google-analytics', 'googletagmanager', 'doubleclick', 'facebook', 'adservice', 'adsystem'
];

const targetWord = [
    '101뷰 패밀리룸',
    '101 view family room'
];

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

        const targetRooms = rooms.filter(room =>
            room.available &&
            targetWord.some(name =>
                room.name.toLowerCase().includes(name.toLowerCase())
            ));

        console.log(`[${new Date().toLocaleTimeString()}]`);
        if (targetRooms.length) {
            console.log('✅ 예약 가능한 룸:');
            targetRooms.forEach(room => {
                console.log(`- ${room.name}`);
                console.log(`  ▸ ￦${room.price}`);
            });

            notifier.notify({
                title: '✅ 룸 알림',
                message: targetRooms[0].name,
                sound: true,
                wait: false
            });
        } else {
            console.log('❌ 룸 없음');
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
        await browser.close();
        process.exit();
    });
}

scrapeAgodaRooms();
