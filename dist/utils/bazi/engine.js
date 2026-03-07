// ════════════════════════════════════════════════════════════════
// src/utils/bazi/engine.ts — Bazi Calculation Engine
//
// ใช้ tyme4ts เป็น core library สำหรับการคำนวณปฏิทินจันทรคติจีน
// และ cantian-tymext สำหรับ 神煞 (Shen Sha) และ 刑冲合会
//
// Standalone TypeScript — ไม่ต้องพึ่ง MCP Server ที่ runtime
// ════════════════════════════════════════════════════════════════
import { ChildLimit, DefaultEightCharProvider, HeavenStem, LunarSect2EightCharProvider, LunarHour, SolarTime, Gender, } from 'tyme4ts';
import { calculateRelation } from 'cantian-tymext';
import { ELEMENTS, TEN_GOD_THAI, LIFE_STAGE_STRENGTH, } from '../../types/bazi.js';
// ────────────────────────────────────────────────────────────────
// SECTION 1: ตัวแปลง tyme4ts → TypeScript interfaces
// ────────────────────────────────────────────────────────────────
/** แปลงชื่อธาตุจาก tyme4ts (จีน) → Element type */
function toElement(chineseElement) {
    const map = {
        '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal', '水': 'Water',
    };
    const e = map[chineseElement];
    if (!e)
        throw new Error(`Unknown element: ${chineseElement}`);
    return e;
}
/** แปลง HeavenStem (tyme4ts) → HeavenlyStem interface */
function mapHeavenStem(stem) {
    return {
        char: stem.toString(),
        element: toElement(stem.getElement().toString()),
        polarity: stem.getYinYang() === 1 ? 'Yang' : 'Yin',
        index: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(stem.toString()),
    };
}
/** แปลง EarthBranch (tyme4ts) → EarthlyBranch interface */
function mapEarthBranch(branch) {
    const ZODIACS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
    return {
        char: branch.toString(),
        element: toElement(branch.getElement().toString()),
        polarity: branch.getYinYang() === 1 ? 'Yang' : 'Yin',
        index: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(branch.toString()),
        zodiac: branch.getZodiac().toString(),
    };
}
/** แปลง TenStar (tyme4ts) → TenGod interface */
function mapTenGod(tenStar) {
    const name = tenStar.toString();
    const CATEGORIES = {
        '比肩': 'Companion', '劫财': 'Companion',
        '食神': 'Output', '伤官': 'Output',
        '偏财': 'Wealth', '正财': 'Wealth',
        '七杀': 'Power', '正官': 'Power',
        '偏印': 'Resource', '正印': 'Resource',
    };
    const POLARITY = {
        '比肩': 'same', '劫财': 'opposite',
        '食神': 'same', '伤官': 'opposite',
        '偏财': 'same', '正财': 'opposite',
        '七杀': 'same', '正官': 'opposite',
        '偏印': 'same', '正印': 'opposite',
    };
    return {
        name,
        nameTH: TEN_GOD_THAI[name] ?? name,
        category: CATEGORIES[name] ?? 'Companion',
        polarity: POLARITY[name] ?? 'same',
    };
}
/** แปลง Terrain (十二長生) → LifeStage interface */
function mapLifeStage(terrain) {
    // tyme4ts ใช้ simplified Chinese — normalize ถ้าจำเป็น
    const NORMALIZED = {
        '长生': '長生', '沐浴': '沐浴', '冠带': '冠帶', '冠帶': '冠帶',
        '临官': '臨官', '臨官': '臨官', '帝旺': '帝旺', '衰': '衰',
        '病': '病', '死': '死', '墓': '墓', '绝': '絕', '絕': '絕',
        '胎': '胎', '养': '養', '養': '養',
    };
    const normalized = NORMALIZED[terrain] ?? terrain;
    return {
        name: normalized,
        index: ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'].indexOf(normalized),
        strength: LIFE_STAGE_STRENGTH[normalized] ?? 'moderate',
    };
}
/** แปลง HiddenStems (藏干) ของ branch */
function mapHiddenStems(branch, dayMaster) {
    const result = [];
    const main = branch.getHideHeavenStemMain();
    const middle = branch.getHideHeavenStemMiddle();
    const resid = branch.getHideHeavenStemResidual();
    if (main)
        result.push({ stem: mapHeavenStem(main), tenGod: mapTenGod(dayMaster.getTenStar(main)), role: 'main' });
    if (middle)
        result.push({ stem: mapHeavenStem(middle), tenGod: mapTenGod(dayMaster.getTenStar(middle)), role: 'middle' });
    if (resid)
        result.push({ stem: mapHeavenStem(resid), tenGod: mapTenGod(dayMaster.getTenStar(resid)), role: 'residual' });
    return result;
}
/** แปลง SixtyCycle (干支) → Pillar interface */
function mapPillar(sixtyCycle, dayMaster, isDay = false) {
    const stem = sixtyCycle.getHeavenStem();
    const branch = sixtyCycle.getEarthBranch();
    return {
        stem: mapHeavenStem(stem),
        branch: mapEarthBranch(branch),
        hiddenStems: mapHiddenStems(branch, dayMaster),
        tenGod: isDay ? undefined : mapTenGod(dayMaster.getTenStar(stem)),
        lifeStage: mapLifeStage(dayMaster.getTerrain(branch).toString()),
        nayin: sixtyCycle.getSound().toString(),
        decade: sixtyCycle.getTen().toString(),
        voidBranches: sixtyCycle.getExtraEarthBranches().join(''),
        terrain: stem.getTerrain(branch).toString(),
    };
}
// ────────────────────────────────────────────────────────────────
// SECTION 2: True Solar Time (真太陽時) Adjustment
// ────────────────────────────────────────────────────────────────
/**
 * ปรับเวลาเป็น True Solar Time โดยคำนวณจากลองจิจูด
 *
 * หลักการ: ทุก 1° ลองจิจูด = 4 นาที
 * Standard meridian = timezoneOffsetMinutes / 4 (องศา)
 * ผลต่าง = (longitude - standardMeridian) × 4 นาที
 *
 * ตัวอย่าง: กทม (100.5°E), UTC+7 (105°E standard)
 *   offset = (100.5 - 105) × 4 = -18 นาที
 *   23:02 - 18 = 22:44 True Solar Time
 *
 * @returns { year, month, day, hour, minute } หลังปรับ (รวม day boundary)
 */
export function adjustTrueSolarTime(year, month, day, hour, minute, longitudeDegrees, timezoneOffsetMinutes) {
    const standardMeridian = timezoneOffsetMinutes / 4;
    const diffMinutes = Math.round((longitudeDegrees - standardMeridian) * 4);
    let total = hour * 60 + minute + diffMinutes;
    // จัดการ day boundary
    const d = new Date(year, month - 1, day);
    if (total < 0) {
        d.setDate(d.getDate() - 1);
        total += 1440;
    }
    else if (total >= 1440) {
        d.setDate(d.getDate() + 1);
        total -= 1440;
    }
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: Math.floor(total / 60),
        minute: total % 60,
    };
}
// ────────────────────────────────────────────────────────────────
// SECTION 3: เตรียม Local True Solar Time สำหรับ tyme4ts
// ────────────────────────────────────────────────────────────────
/**
 * เตรียมวันเวลาสำหรับส่งให้ tyme4ts
 *
 * tyme4ts.SolarTime.fromYmdHms() รับ Gregorian date/time ในเวลาท้องถิ่น
 * ของสถานที่เกิด (True Solar Time) โดยตรง — ไม่ต้อง convert เป็น UTC+8
 *
 * เหตุผล: Chinese calendar calculation ใช้ Gregorian date เป็น base
 * ซึ่งเป็น universal (ไม่ขึ้นกับ timezone) ส่วน 时柱 (hour pillar)
 * ใช้ local True Solar Time ของสถานที่เกิดโดยตรง
 *
 * Bug เดิม: แปลง Bangkok 23:02 → UTC+8 00:02 Aug 28 ทำให้หลักวันผิด
 */
function prepareCalcTime(input, hour, minute) {
    const { year, month, day, useTrueSolarTime, longitudeDegrees, timezoneOffsetMinutes } = input;
    // ถ้าเปิด True Solar Time และมีลองจิจูด → ปรับเวลาก่อน
    if (useTrueSolarTime && longitudeDegrees !== undefined && hour >= 0) {
        return adjustTrueSolarTime(year, month, day, hour, minute, longitudeDegrees, timezoneOffsetMinutes);
    }
    // ไม่มี True Solar Time → ใช้เวลาท้องถิ่นมาตรฐานโดยตรง
    // (ไม่ convert UTC+8 เพราะทำให้วันเปลี่ยนเมื่อเกิดใกล้เที่ยงคืน)
    return { year, month, day, hour, minute };
}
// ────────────────────────────────────────────────────────────────
// SECTION 4: คำนวณ Element Strength (น้ำหนักธาตุ)
// ────────────────────────────────────────────────────────────────
/**
 * คำนวณน้ำหนักธาตุทั้ง 5 จาก 8 ตัวอักษร
 *
 * น้ำหนัก:
 *  - Heavenly Stem (天干) ของแต่ละหลัก: 1 คะแนน
 *  - Earthly Branch (地支) เป็น element หลัก: 1 คะแนน
 *  - Hidden Stems (藏干): main=0.6, middle=0.3, residual=0.1
 */
export function calculateElementStrength(eightChars) {
    const counts = {
        Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0,
    };
    function addPillar(pillar) {
        if (!pillar)
            return;
        // Stem
        counts[pillar.stem.element] += 1;
        // Branch (main element)
        counts[pillar.branch.element] += 1;
        // Hidden stems (藏干)
        for (const hs of pillar.hiddenStems) {
            const weight = hs.role === 'main' ? 0.6 : hs.role === 'middle' ? 0.3 : 0.1;
            counts[hs.stem.element] += weight;
        }
    }
    addPillar(eightChars.year);
    addPillar(eightChars.month);
    addPillar(eightChars.day);
    addPillar(eightChars.hour);
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const percentages = {};
    for (const e of ELEMENTS) {
        percentages[e] = Math.round((counts[e] / total) * 100);
    }
    // หาธาตุเด่น/อ่อน
    const dominant = ELEMENTS.reduce((a, b) => counts[a] >= counts[b] ? a : b);
    const weakest = ELEMENTS.reduce((a, b) => counts[a] <= counts[b] ? a : b);
    // ความแข็งแกร่งของ Day Master
    const dmElem = eightChars.dayMaster.element;
    const dmPct = percentages[dmElem];
    let dayMasterLabel;
    if (dmPct >= 40)
        dayMasterLabel = 'very-strong';
    else if (dmPct >= 28)
        dayMasterLabel = 'strong';
    else if (dmPct >= 18)
        dayMasterLabel = 'balanced';
    else if (dmPct >= 10)
        dayMasterLabel = 'weak';
    else
        dayMasterLabel = 'very-weak';
    return {
        ...counts,
        total,
        percentages,
        dominant,
        weakest,
        dayMasterStrength: dmPct,
        dayMasterLabel,
    };
}
// ────────────────────────────────────────────────────────────────
// SECTION 5: ฟังก์ชันหลัก calculateBazi
// ────────────────────────────────────────────────────────────────
/**
 * คำนวณ Bazi ครบชุด
 *
 * @example
 * ```ts
 * const result = await calculateBazi({
 *   year: 1990, month: 3, day: 15,
 *   hour: 14, minute: 30,
 *   gender: 'male',
 *   timezoneOffsetMinutes: 420, // UTC+7 (ไทย)
 *   eightCharProviderSect: 2,
 *   annualPillarRange: { from: 2020, to: 2035 },
 * });
 * ```
 */
export async function calculateBazi(input) {
    const { year, month, day, gender, eightCharProviderSect = 2, annualPillarRange = { from: 2020, to: 2035 }, } = input;
    const { hour, minute } = input;
    const hasTime = hour >= 0 && minute >= 0;
    // ── 1. เตรียมเวลาสำหรับคำนวณ (True Solar Time หรือ Local Standard) ──
    // ใช้ local time โดยตรง — ไม่แปลง UTC+8 เพราะทำให้วันเปลี่ยน
    const calcH = hasTime ? hour : 12;
    const calcM = hasTime ? minute : 0;
    const calc = prepareCalcTime(input, calcH, calcM);
    // ── 2. ตั้งค่า EightChar Provider (Early/Late Zi 早晚子时) ─────
    // Sect 2: 23:00-23:59 นับเป็นวัน 子时 ของวันเดิม (Late Zi)
    // Sect 1: 23:00-23:59 นับเป็นวัน 子时 ของวันถัดไป (Early Zi)
    if (eightCharProviderSect === 2) {
        LunarHour.provider = new LunarSect2EightCharProvider();
    }
    else {
        LunarHour.provider = new DefaultEightCharProvider();
    }
    // ── 3. สร้าง SolarTime และ LunarHour ─────────────────────────
    // ส่ง Local True Solar Time โดยตรง (ไม่ผ่าน UTC+8)
    const solarTime = SolarTime.fromYmdHms(calc.year, calc.month, calc.day, calc.hour, calc.minute, 0);
    const lunarHour = solarTime.getLunarHour();
    // ── 5. คำนวณ EightChar ──────────────────────────────────────
    const eightChar = lunarHour.getEightChar();
    const dayMasterStem = eightChar.getDay().getHeavenStem();
    // แปลงสี่หลัก
    const yearPillar = mapPillar(eightChar.getYear(), dayMasterStem);
    const monthPillar = mapPillar(eightChar.getMonth(), dayMasterStem);
    const dayPillar = mapPillar(eightChar.getDay(), dayMasterStem, true);
    const hourPillar = hasTime
        ? mapPillar(eightChar.getHour(), dayMasterStem)
        : null;
    const eightChars = {
        year: yearPillar,
        month: monthPillar,
        day: dayPillar,
        hour: hourPillar,
        dayMaster: mapHeavenStem(dayMasterStem),
        zodiac: eightChar.getYear().getEarthBranch().getZodiac().toString(),
        baziString: eightChar.toString(),
        fetalOrigin: eightChar.getFetalOrigin().toString(),
        fetalBreath: eightChar.getFetalBreath().toString(),
        ownSign: eightChar.getOwnSign().toString(),
        bodySign: eightChar.getBodySign().toString(),
    };
    // ── 6. คำนวณ Luck Pillars (大运) ─────────────────────────────
    const genderEnum = gender === 'male' ? Gender.MAN : Gender.WOMAN;
    const childLimit = ChildLimit.fromSolarTime(solarTime, genderEnum);
    let decadeFortune = childLimit.getStartDecadeFortune();
    const firstStartAge = decadeFortune.getStartAge();
    const startDateObj = childLimit.getEndTime();
    const startDate = `${startDateObj.getYear()}-${String(startDateObj.getMonth()).padStart(2, '0')}-${String(startDateObj.getDay()).padStart(2, '0')}`;
    const currentYear = new Date().getFullYear();
    // หาทิศทาง (顺/逆) จาก firstStartAge: ถ้า forward → age เพิ่มขึ้น
    // ใช้ decadeFortune.getStartAge() ของ index 0 และ 1 เปรียบเทียบ
    const firstAge = decadeFortune.getStartAge();
    const secondAge = decadeFortune.next(1).getStartAge();
    const direction = secondAge > firstAge ? 'forward' : 'backward';
    const luckPillarsList = [];
    for (let i = 0; i < 8; i++) {
        const sc = decadeFortune.getSixtyCycle();
        const startAge = decadeFortune.getStartAge();
        const endAge = decadeFortune.getEndAge();
        const startYr = decadeFortune.getStartSixtyCycleYear().getYear();
        const endYr = decadeFortune.getEndSixtyCycleYear().getYear();
        const stem = sc.getHeavenStem();
        const branch = sc.getEarthBranch();
        luckPillarsList.push({
            pillar: mapPillar(sc, dayMasterStem),
            startAge,
            endAge,
            startYear: startYr,
            endYear: endYr,
            stemTenGod: mapTenGod(dayMasterStem.getTenStar(stem)),
            branchTenGods: branch.getHideHeavenStems().map(hs => mapTenGod(dayMasterStem.getTenStar(hs.getHeavenStem()))),
            isActive: startYr <= currentYear && currentYear <= endYr,
        });
        decadeFortune = decadeFortune.next(1);
    }
    const luckPillars = {
        pillars: luckPillarsList,
        startAge: firstStartAge,
        startDate,
        direction,
    };
    // ── 7. คำนวณ Annual Pillars (流年) ───────────────────────────
    const annualPillars = [];
    for (let yr = annualPillarRange.from; yr <= annualPillarRange.to; yr++) {
        // ใช้ SolarTime วันที่ 1 มี.ค. ของแต่ละปี (หลัง立春) เป็น reference
        const ySolar = SolarTime.fromYmdHms(yr, 3, 1, 0, 0, 0);
        const yEightChar = ySolar.getLunarHour().getEightChar();
        const ySC = yEightChar.getYear();
        const yStem = ySC.getHeavenStem();
        annualPillars.push({
            year: yr,
            pillar: mapPillar(ySC, dayMasterStem),
            tenGod: mapTenGod(dayMasterStem.getTenStar(yStem)),
            isCurrentYear: yr === currentYear,
        });
    }
    // ── 8. คำนวณ Monthly Pillars (流月) ปีปัจจุบัน ───────────────
    const monthlyPillars = [];
    for (let mo = 1; mo <= 12; mo++) {
        // วันที่ 15 ของแต่ละเดือนเป็น reference (อยู่กลางเดือนสุริยคติ)
        const mSolar = SolarTime.fromYmdHms(currentYear, mo, 15, 0, 0, 0);
        const mEC = mSolar.getLunarHour().getEightChar();
        const mSC = mEC.getMonth();
        const mStem = mSC.getHeavenStem();
        monthlyPillars.push({
            year: currentYear,
            month: mo,
            pillar: mapPillar(mSC, dayMasterStem),
            tenGod: mapTenGod(dayMasterStem.getTenStar(mStem)),
        });
    }
    // ── 9. คำนวณ Element Strength ────────────────────────────────
    const elementStrength = calculateElementStrength(eightChars);
    // ── 10. คำนวณ Interactions (刑冲合会) ──────────────────────────
    const ec = eightChar;
    const rawRelations = calculateRelation({
        年: { 天干: ec.getYear().getHeavenStem().toString(), 地支: ec.getYear().getEarthBranch().toString() },
        月: { 天干: ec.getMonth().getHeavenStem().toString(), 地支: ec.getMonth().getEarthBranch().toString() },
        日: { 天干: ec.getDay().getHeavenStem().toString(), 地支: ec.getDay().getEarthBranch().toString() },
        时: { 天干: ec.getHour().getHeavenStem().toString(), 地支: ec.getHour().getEarthBranch().toString() },
    });
    const interactions = {
        combinations: extractInteraction(rawRelations, '合'),
        clashes: extractInteraction(rawRelations, '冲'),
        punishments: extractInteraction(rawRelations, '刑'),
        harms: extractInteraction(rawRelations, '害'),
        destructions: extractInteraction(rawRelations, '破'),
    };
    // ── 11. รวมผลลัพธ์ ────────────────────────────────────────────
    return {
        input: { ...input, hour: calc.hour, minute: calc.minute }, // เก็บเวลาหลังปรับ
        eightChars,
        luckPillars,
        annualPillars,
        monthlyPillars,
        elementStrength,
        interactions,
        calculatedAt: new Date().toISOString(),
    };
}
// ────────────────────────────────────────────────────────────────
// SECTION 6: ฟังก์ชันเสริม
// ────────────────────────────────────────────────────────────────
/**
 * ดึงรายการ interaction จาก rawRelations object ของ cantian-tymext
 *
 * Structure: { 年: { 天干: { 冲: [{柱, 知识点}] }, 地支: { 合: [...] } }, ... }
 * key = '合' | '冲' | '刑' | '害' | '破' (match ด้วย includes เพื่อจับ 半合 ด้วย)
 */
function extractInteraction(rawRelations, key) {
    const result = [];
    // วน 年月日时
    for (const pillarVal of Object.values(rawRelations)) {
        if (!pillarVal || typeof pillarVal !== 'object')
            continue;
        // วน 天干/地支
        for (const stemBranchVal of Object.values(pillarVal)) {
            if (!stemBranchVal || typeof stemBranchVal !== 'object')
                continue;
            // วน interaction type keys เช่น 冲/合/刑/害/破/半合
            for (const [interKey, entries] of Object.entries(stemBranchVal)) {
                if (!interKey.includes(key))
                    continue;
                if (!Array.isArray(entries))
                    continue;
                for (const entry of entries) {
                    if (entry && typeof entry === 'object' && '知识点' in entry) {
                        result.push(entry.知识点);
                    }
                }
            }
        }
    }
    return [...new Set(result)]; // dedupe
}
/**
 * คำนวณ Daily Pillars (流日) สำหรับช่วงวัน
 *
 * @param from  วันเริ่มต้น (Date object)
 * @param to    วันสิ้นสุด
 * @param dayMasterChar  อักษรเจ้าชะตา (จาก BaziResult.eightChars.dayMaster.char)
 */
export function getDailyPillars(from, to, dayMasterChar) {
    const dayMaster = HeavenStem.fromName(dayMasterChar);
    const results = [];
    const cur = new Date(from);
    while (cur <= to) {
        const s = SolarTime.fromYmdHms(cur.getFullYear(), cur.getMonth() + 1, cur.getDate(), 0, 0, 0);
        const daySC = s.getLunarHour().getEightChar().getDay();
        const stem = daySC.getHeavenStem();
        const tenGod = dayMaster.getTenStar(stem);
        results.push({
            date: cur.toISOString().split('T')[0],
            stemChar: stem.toString(),
            branchChar: daySC.getEarthBranch().toString(),
            tenGodName: tenGod.toString(),
        });
        cur.setDate(cur.getDate() + 1);
    }
    return results;
}
/**
 * คำนวณ Bazi จากวันเดือนปี (ไม่มีเวลา) — เวลาจะถูก ignore ในการคำนวณ Hour Pillar
 */
export function calculateBaziNoTime(year, month, day, gender, timezoneOffsetMinutes = 480) {
    return calculateBazi({
        year, month, day,
        hour: -1, minute: -1,
        gender,
        timezoneOffsetMinutes,
    });
}
// ────────────────────────────────────────────────────────────────
// SECTION 7: Demo (รันตรงๆ ด้วย tsx)
// ────────────────────────────────────────────────────────────────
async function demo() {
    console.log('══════════════════════════════════════════════');
    console.log('  Bazi Calculation Engine — Demo');
    console.log('  27 ส.ค. 2535  23:02 น.  กทม. (ชาย)');
    console.log('══════════════════════════════════════════════\n');
    // ทดสอบกับวันเกิด 27 ส.ค. 1992, 23:02, กทม. (UTC+7, ลองจิจูด 100.5°E)
    // True Solar Time: 23:02 - 18 min = 22:44 → 亥时
    // Expected: 壬申 戊申 乙亥 丁亥 (Day Master: 乙 Wood Yin)
    const result = await calculateBazi({
        year: 1992, month: 8, day: 27,
        hour: 23, minute: 2,
        gender: 'male',
        timezoneOffsetMinutes: 420, // UTC+7 (ไทย)
        useTrueSolarTime: true,
        longitudeDegrees: 100.5, // กรุงเทพฯ ≈ 100.5°E
        eightCharProviderSect: 2,
        annualPillarRange: { from: 2020, to: 2035 },
    });
    const { eightChars, luckPillars, elementStrength } = result;
    console.log(`八字 (Ba Zi): ${eightChars.baziString}`);
    console.log(`日主 (Day Master): ${eightChars.dayMaster.char} ${eightChars.dayMaster.element} ${eightChars.dayMaster.polarity}`);
    console.log(`นักษัตร: ${eightChars.zodiac}`);
    console.log(`胎元: ${eightChars.fetalOrigin} | 命宫: ${eightChars.ownSign} | 身宫: ${eightChars.bodySign}`);
    console.log('\n── สี่หลัก ──');
    for (const [label, p] of [['年柱', eightChars.year], ['月柱', eightChars.month], ['日柱', eightChars.day], ['时柱', eightChars.hour]]) {
        if (!p) {
            console.log(`${label}: —`);
            continue;
        }
        const tenGodStr = p.tenGod ? `[${p.tenGod.name} ${p.tenGod.nameTH}]` : '[日主]';
        console.log(`${label}: ${p.stem.char}${p.branch.char}  ${tenGodStr}  纳音:${p.nayin}  長生:${p.lifeStage.name}`);
        console.log(`  藏干: ${p.hiddenStems.map(h => `${h.stem.char}(${h.tenGod.name})`).join(' ')}`);
    }
    console.log('\n── 大运 (Luck Pillars) ──');
    console.log(`ทิศทาง: ${luckPillars.direction} | เริ่มอายุ: ${luckPillars.startAge} ปี | วันเริ่ม: ${luckPillars.startDate}`);
    for (const lp of luckPillars.pillars) {
        const active = lp.isActive ? ' ◄ ปัจจุบัน' : '';
        console.log(`  อายุ ${String(lp.startAge).padStart(2)}-${String(lp.endAge).padStart(2)}  (${lp.startYear}-${lp.endYear})  ${lp.pillar.stem.char}${lp.pillar.branch.char}${active}`);
    }
    console.log('\n── 五行 Element Strength ──');
    for (const e of ['Wood', 'Fire', 'Earth', 'Metal', 'Water']) {
        const bar = '█'.repeat(Math.round(elementStrength.percentages[e] / 5));
        console.log(`  ${e.padEnd(5)}: ${String(elementStrength.percentages[e]).padStart(3)}%  ${bar}`);
    }
    console.log(`  Day Master: ${elementStrength.dayMasterStrength}% → ${elementStrength.dayMasterLabel}`);
    console.log('\n── 刑冲合会 ──');
    const { interactions } = result;
    if (interactions.combinations.length)
        console.log(`  合: ${interactions.combinations.join(', ')}`);
    if (interactions.clashes.length)
        console.log(`  冲: ${interactions.clashes.join(', ')}`);
    if (interactions.punishments.length)
        console.log(`  刑: ${interactions.punishments.join(', ')}`);
    console.log('\n✓ Engine พร้อมใช้งาน\n');
}
// รันเฉพาะตอนเรียกโดยตรง (tsx src/utils/bazi/engine.ts)
const isMain = process.argv[1]?.endsWith('engine.ts') || process.argv[1]?.endsWith('engine.js');
if (isMain)
    demo().catch(console.error);
//# sourceMappingURL=engine.js.map