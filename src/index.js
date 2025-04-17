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
// 1. 크롤링 대상 URL 설정
const TARGET_URL = 'https://www.agoda.com/ko-kr/roaders-plus-hotel/hotel/taipei-tw.html';
// 2. 스크레이퍼 실행 함수
function checkRoomAvailability() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            headless: true, // 기본값 (v22+)
            args: ['--no-sandbox']
        });
        const page = yield browser.newPage();
        try {
            // 3. 헤더 설정 (봇 차단 회피)
            yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            // 4. 페이지 이동 및 대기
            yield page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
            // 5. 객실 정보 추출
            const rooms = yield page.evaluate(() => {
                const roomElements = Array.from(document.querySelectorAll('.RoomGridItem'));
                return roomElements.map(room => {
                    var _a, _b, _c, _d;
                    return ({
                        name: (_b = (_a = room.querySelector('.RoomGridItem__title')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim(),
                        price: (_d = (_c = room.querySelector('.Price__final')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()
                    });
                });
            });
            // 6. 특정 객실 존재 여부 확인
            const hasTaipeiStationRoom = rooms.some(room => {
                var _a, _b;
                return ((_a = room.name) === null || _a === void 0 ? void 0 : _a.includes('타이베이 스테이션')) ||
                    ((_b = room.name) === null || _b === void 0 ? void 0 : _b.includes('Taipei Station'));
            });
            // 7. 결과 출력
            console.log('🔍 검색 결과:');
            console.log(`확인된 객실 수: ${rooms.length}`);
            console.log(`타이베이 스테이션 객실 존재: ${hasTaipeiStationRoom ? '✅ 예' : '❌ 아니오'}`);
            console.log('추출된 객실 목록:', rooms);
        }
        catch (error) {
            console.error('⚠️ 오류 발생:', error);
        }
        finally {
            yield browser.close();
        }
    });
}
// 실행
checkRoomAvailability();
