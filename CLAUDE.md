# CLAUDE.md — Project 1: Web ดูดวง Bazi

## ภาพรวมโปรเจกต์

เว็บแอปพลิเคชันดูดวงด้วยศาสตร์บาจื่อ (Bazi / Four Pillars of Destiny)
แนวคิด: "บาจื่อคือหลักธรรมชาติ + เทคโนโลยี AI"

## Tech Stack

- **HTML** — โครงสร้างหน้าเว็บ (ไฟล์หลัก: `index.html`)
- **CSS** — Tailwind CSS สำหรับ Layout และ Responsive Design
- **JavaScript** — Vanilla JS (ไม่ใช้ Framework)
- **Architecture** — Modular Code แยก Logic การคำนวณออกจาก UI

## โครงสร้างหน้าเว็บ

### 1. Landing Page
- อธิบายแนวคิดบาจื่อ
- ปุ่ม CTA "วิเคราะห์ดวง"

### 2. Main Application (2 คอลัมน์)

**Sidebar (ซ้าย):**
- พื้นดวงสี่เสา
- กราฟ Radar รายเดือน
- วิเคราะห์เบื้องต้น (ฟรี): นิสัย, การงาน, การเงิน
- บริการพรีเมียม (Pro)

**Main Content (ขวา):**
- Input Form: ชื่อ, วัน/เดือน/ปีเกิด, เวลาเกิด, จังหวัดเกิด (คำนวณ True Solar Time)
- Bazi Chart: ตาราง 8 ตัวอักษร (ปี/เดือน/วัน/ยาม) + 5 ธาตุ + หยิน-หยาง
- Luck Pillar ทุก 10 ปี
- Year Cycle ทุกปี
- Analysis Result: Day Master + ความหมายแต่ละหลัก

### 3. Premium Section (Pro)
- ราคา 499 บาท
- PDF + PowerPoint + ไฟล์เสียงวิเคราะห์เฉพาะบุคคล
- จัดส่งภายใน 2 วันทำการ
- ปุ่ม "สั่งซื้อทาง Line"

## ดีไซน์

- **ธีมสี**: โทนสีทอง เรียบหรู (Gold Elegant) — อ้างอิง cantian.ai
- **สไตล์**: Modern & Clean UI
- **ตาราง Bazi**: อ้างอิง bazi.fengshuix.com
- **Responsive**: รองรับทั้ง Mobile และ Desktop

## Guidelines สำหรับ Claude

- เขียน Comment อธิบาย Code ในส่วนการคำนวณ Four Pillars อย่างละเอียด
- แยก Logic การคำนวณดวง (Bazi engine) ออกจากส่วนแสดงผล UI
- ออกแบบให้รองรับการเพิ่ม AI วิเคราะห์ในอนาคต
- ใช้ภาษาไทยในส่วน UI และ Comment
- ไม่เพิ่มฟีเจอร์เกินที่กำหนดใน Prompt Web.txt
