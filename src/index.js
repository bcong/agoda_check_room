"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const node_notifier_1 = __importDefault(require("node-notifier"));
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
const targetUrl = "https://www.agoda.com/ko-kr/roaders-plus-hotel/hotel/taipei-tw.html?checkIn=2025-10-04&los=4&Rooms=1&Adults=4";
function checkRooms(page) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield page.reload({ waitUntil: 'domcontentloaded' });
            yield page.waitForSelector('[data-selenium="MasterRoom"]', { timeout: 60000 });
            const rooms = yield page.evaluate(() => {
                return Array.from(document.querySelectorAll('[data-selenium="MasterRoom"]')).map(room => {
                    var _a, _b, _c, _d;
                    const name = ((_b = (_a = room.querySelector('[data-selenium="masterroom-title-name"]')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                    const price = ((_d = (_c = room.querySelector('[data-selenium="PriceDisplay"] strong')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                    const available = !!room.querySelector('[data-selenium="ChildRoomsList-bookButtonInput"]');
                    return {
                        name,
                        price,
                        available,
                    };
                });
            });
            const targetRooms = rooms.filter(room => room.available &&
                targetWord.some(name => room.name.toLowerCase().includes(name.toLowerCase())));
            console.log(`[${new Date().toLocaleTimeString()}]`);
            if (targetRooms.length) {
                console.log('✅ 예약 가능한 룸:');
                targetRooms.forEach(room => {
                    console.log(`- ${room.name}`);
                    console.log(`  ▸ ￦${room.price}`);
                });
                node_notifier_1.default.notify({
                    title: '✅ 룸 알림',
                    message: targetRooms[0].name,
                    sound: true,
                    wait: false
                });
            }
            else {
                console.log('❌ 룸 없음');
            }
            console.log('');
            setTimeout(() => checkRooms(page), 10 * 1000);
        }
        catch (error) {
            console.error('⚠️ 오류 발생:', error);
            setTimeout(() => checkRooms(page), 10 * 1000);
        }
    });
}
function scrapeAgodaRooms() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: [
                '--disable-gpu',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-features=site-per-process',
                '--no-zygote',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials',
                '--disable-raf-throttling',
            ]
        });
        const page = yield browser.newPage();
        yield page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (blockedResourceTypes.includes(request.resourceType()) ||
                blockedDomains.some((domain) => url.includes(domain))) {
                request.abort();
            }
            else {
                request.continue();
            }
        });
        try {
            yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            yield page.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            console.log(`Target Url: ${targetUrl}`);
            yield checkRooms(page);
        }
        catch (error) {
            console.error('⚠️ 초기화 오류:', error);
            yield browser.close();
        }
        process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
            yield browser.close();
            process.exit();
        }));
    });
}
scrapeAgodaRooms();
