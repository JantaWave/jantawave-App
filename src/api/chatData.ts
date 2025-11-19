// lib/chatData.ts
export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  createdAt: string; // ISO
  type?: 'text' | 'image' | 'system';
};

export type Chat = {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar?: string;
  leaderOnline?: boolean;
  lastMessage?: string;
  lastMessageAt?: string; // ISO
  unreadCount?: number;
  messages: Message[];
};

const now = new Date();

const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

export const DUMMY_CHATS: Chat[] = [
  {
    id: '1',
    leaderId: 'u_101',
    leaderName: 'Amit Sharma',
    leaderAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmRq0a_frE8gwzWtWvJSav54nBpgBCJh21lHB4mdigWa2KM9foYQiyxRQcpjKUUSOcGB28_C5qCX1Gtrmd4FpNsil-hjbiJqdzHYc45idTwJdsKkZhZS8nAsCE_-UuA1qFYWI5A80kp-t7JVxZhgvhVh1v2-CY_FbY0hYpwVxLfYsqORT5PF_hoh7JxnkYSes7-WgZTcvsnKzah_Ooj_USwQ_2Kx1R8pRdQyLN2HMMyKt1_fEK6fP_OGFMcozO5YlxMtwwTzf5Grc',
    leaderOnline: true,
    lastMessage: 'See you at the meeting!',
    lastMessageAt: minutesAgo(2),
    unreadCount: 2,
    messages: [
      { id: 'm1', chatId: 'chat_1', senderId: 'u_101', text: 'Hey 👋', createdAt: hoursAgo(2) },
      {
        id: 'm2',
        chatId: 'chat_1',
        senderId: 'me',
        text: 'Hi! Are we on for today?',
        createdAt: hoursAgo(2),
      },
      {
        id: 'm3',
        chatId: 'chat_1',
        senderId: 'u_101',
        text: 'Yes, 4 PM',
        createdAt: minutesAgo(120),
      },
    ],
  },

  {
    id: '2',
    leaderId: 'u_102',
    leaderName: 'Neha Verma',
    leaderAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAnWDXimVfKM_z6Z7EeMILgDSPB3VDgIUweww-T8LkOo-hSlMozt3IWuGu6IBjTatmP7LzK9CdTUEVoRAEhtLdr3ikxHMVpAzWUiLpnZTzIakthR85TmCZQu6PkRt8-GfqSSjc_R3jALEUkCZyu4yX8AJEuaLd8LwqM0VKGBN2BTzMfv_hNw2giB_r3etdidOC4_IICFOFPDZvM7dNyIiYsPuv7_jO06nBuIY_OgjEs1txNB1YUHnJOdH-U2cVP7HTN--BgoC2bLVU',
    leaderOnline: false,
    lastMessage: 'Got it, thanks!',
    lastMessageAt: minutesAgo(10),
    unreadCount: 0,
    messages: [
      {
        id: 'm4',
        chatId: 'chat_2',
        senderId: 'u_102',
        text: 'Please review the doc',
        createdAt: hoursAgo(1),
      },
      { id: 'm5', chatId: 'chat_2', senderId: 'me', text: 'Done ✅', createdAt: minutesAgo(10) },
    ],
  },

  {
    id: '3',
    leaderId: 'u_103',
    leaderName: 'Rohit Singh',
    leaderAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJFZwsiExAtbGLIS8vehMxfbwygtfBMi6Y3OXa96cZrGAowv-hEx9r2uNgqCDujh1jPzLowAX-GdAbAVikEKW-xbqIJ6eian5-Bv0szW_Os5oiaWjMHcakeqmwdHz1ynhWAWpv27Uu5pp7ezmvCa5m3pKWW9deoF_vvQ32p67nzyjhdRbKlzJEJw4UQ96KROu1ZSfSctAgGw8TAdV3e_ybSO-lPyZ3_vxuuueqG8ymfUHGlpg1O8VZOOhbk_uUYN2-nlWRxjgu9Fc',
    leaderOnline: false,
    lastMessage: 'Sent the files!',
    lastMessageAt: hoursAgo(1),
    unreadCount: 0,
    messages: [
      {
        id: 'm6',
        chatId: 'chat_3',
        senderId: 'u_103',
        text: 'I uploaded the assets',
        createdAt: hoursAgo(1),
      },
      {
        id: 'm7',
        chatId: 'chat_3',
        senderId: 'me',
        text: 'Thanks — will check',
        createdAt: minutesAgo(55),
      },
    ],
  },
];

export default DUMMY_CHATS;
