# 📬 Unified Email Tracking & Management Dashboard

A full-stack **Next.js** application to connect multiple **Gmail** and **Webmail** accounts, automatically track whether emails have been replied to (**Needs Reply** vs. **Replied**), classify emails into **TT** (Trouble Tickets) and **SCH** (Schedules), and send or reply to emails directly from the dashboard.

---

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Open the Dashboard
Open your browser at [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Connecting Your Email Accounts

Click the **Gear icon (⚙️)** in the top right to open the **Account Manager**:

### For Gmail Accounts
1. Ensure **2-Step Verification** is enabled on your Google Account.
2. Generate an **App Password**:
   - Go to: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Create an app password named e.g. "Email Tracker".
   - Copy the 16-character code.
3. In the dashboard:
   - Select **Gmail**.
   - Enter your email (e.g. `info@gmail.com`).
   - Enter the 16-character App Password.
   - Click **Test Connection** &rarr; **Save & Connect**.

### For Webmail (cPanel / Custom Domain)
1. Select **Webmail**.
2. Enter your display name and full email (e.g. `support@yourdomain.com`).
3. Enter your password.
4. Server defaults will automatically populate:
   - **IMAP Host:** `mail.yourdomain.com` (Port 993, SSL)
   - **SMTP Host:** `mail.yourdomain.com` (Port 465, SSL)
5. Click **Test Connection** &rarr; **Save & Connect**.

---

## 🔍 Key Features

### 1. Track Replied vs. Needs Reply
* 🔴 **Needs Reply:** Inbound emails that you have not responded to yet.
* 🟢 **Replied:** Automatically detected when:
  * The IMAP message has the `\Answered` flag.
  * An outbound message in your Sent folder references this email.
  * You send a reply directly through the dashboard.
* You can also manually toggle an email between *Needs Reply* and *Replied* at any time.

### 2. TT vs. SCH Categorization
* 🏷️ **TT:** Automatically identifies tickets, trouble tickets, and keywords like `TT`, `TT-1234`, `[TT]`.
* 🏷️ **SCH:** Automatically identifies schedules and scheduling messages like `SCH`, `SCH-1234`, `Schedule`.
* Click any email to change its tag or reclassify it instantly.

### 3. Send & Reply Directly from the Dashboard
* When composing a new email or replying, select the **Send From** dropdown to send legitimately from `info@gmail.com` or your webmail account.
* Outbound emails are automatically saved to your mail server's **Sent** folder so your real email app stays synchronized.

---

## 🛠️ Tech Stack
* **Framework:** Next.js 14 (App Router, Server Actions & API Routes)
* **Database:** SQLite with Prisma ORM (`prisma/schema.prisma`)
* **Email Engine:** `imapflow` (IMAP) + `nodemailer` (SMTP) + `mailparser`
* **Styling:** Tailwind CSS + Lucide Icons
