import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, CalendarDays, MessageSquarePlus, SendHorizonal, Sparkles, Swords, Wallet, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/auth-context";
import { askAiAssistant, createBooking, FutsalItem, getFutsals, getMyBookings, getOpponentPosts, getSlots, TimeSlotItem } from "../lib/api";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  ctaLabel?: string;
  ctaRoute?: string;
};

const HOME_WIDGET_FAQ = [
  "How do I book futsal?",
  "What time which futsal is available?",
  "__DYNAMIC_TOMORROW_DATE_QUESTION__",
];

const AI_CHAT_PAGE_FAQ_BASE = [
  "How do I book futsal?",
  "What time which futsal is available?",
  "Which futsal is available at 6 PM?",
  "__DYNAMIC_TOMORROW_DATE_QUESTION__",
  "How do I find opponents?",
  "How does payment work?",
  "How to cancel a booking?",
  "How do refunds work?",
];

export function PlayerChatbot({ autoOpen = false, mode = "widget" }: { autoOpen?: boolean; mode?: "widget" | "page" }) {
  const COOLDOWN_SECONDS = 1;
  const isPageMode = mode === "page";
  const GENERIC_BOOKING_TERMS = new Set(["book", "booking", "slot", "time", "today", "tomorrow", "futsal", "court", "at", "for", "on", "please"]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hello, I am your virtual assistant. Ask me about booking times, prices, and reservations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [pendingBookingContext, setPendingBookingContext] = useState<{ date: string; hour: number | null } | null>(null);
  const [isOpen, setIsOpen] = useState(autoOpen || isPageMode);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const formatOrdinalDay = (day: number) => {
    if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
    const suffix = day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
    return `${day}${suffix}`;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const tomorrowDateQuestion = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayLabel = formatOrdinalDay(tomorrow.getDate());
    const monthLabel = monthNames[tomorrow.getMonth()];
    return `On ${dayLabel} ${monthLabel} which futsal is available?`;
  }, []);

  const homeWidgetFaq = useMemo(
    () => HOME_WIDGET_FAQ.map((item) => (item === "__DYNAMIC_TOMORROW_DATE_QUESTION__" ? tomorrowDateQuestion : item)),
    [tomorrowDateQuestion],
  );

  const aiChatPageFaq = useMemo(() => [
    ...AI_CHAT_PAGE_FAQ_BASE.map((item) => (item === "__DYNAMIC_TOMORROW_DATE_QUESTION__" ? tomorrowDateQuestion : item)),
    "How can I update profile info?",
    "How do I pay at venue?",
    "Where can I see notifications?",
  ], [tomorrowDateQuestion]);

  const quickPrompts = isPageMode ? aiChatPageFaq : homeWidgetFaq;

  const appendMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { id: prev.length + 1, ...message }]);
  };

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldownRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (autoOpen || isPageMode) {
      setIsOpen(true);
    }
  }, [autoOpen, isPageMode]);

  useEffect(() => {
    if (!isPageMode) {
      setIsOpen(false);
    }
  }, [location.pathname, isPageMode]);

  const getIsoDateFromQuestion = (question: string): string => {
    const q = question.toLowerCase();
    const today = new Date();
    if (q.includes("tomorrow")) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const explicitDate = q.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (explicitDate?.[1]) {
      return explicitDate[1];
    }

    const monthMap: Record<string, number> = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    const naturalDate = q.match(/\b(\d{1,2})(st|nd|rd|th)?\s*(of\s*)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/);
    if (naturalDate?.[1] && naturalDate?.[4]) {
      const day = Number(naturalDate[1]);
      const month = monthMap[naturalDate[4]];
      if (day >= 1 && day <= 31 && month) {
        let year = today.getFullYear();
        const candidate = new Date(year, month - 1, day);
        if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          year += 1;
        }
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    const mergedNaturalDate = q.match(/\b(\d{1,2})(st|nd|rd|th)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/);
    if (mergedNaturalDate?.[1] && mergedNaturalDate?.[3]) {
      const day = Number(mergedNaturalDate[1]);
      const month = monthMap[mergedNaturalDate[3]];
      if (day >= 1 && day <= 31 && month) {
        let year = today.getFullYear();
        const candidate = new Date(year, month - 1, day);
        if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          year += 1;
        }
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };

  const parseHourFromQuestion = (question: string): number | null => {
    const q = question.toLowerCase();

    const amPmMatch = q.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if (amPmMatch) {
      const rawHour = Number(amPmMatch[1]);
      const suffix = amPmMatch[3];
      let hour24 = rawHour % 12;
      if (suffix === "pm") hour24 += 12;
      return hour24;
    }

    const twentyFourMatch = q.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
    if (twentyFourMatch) {
      return Number(twentyFourMatch[1]);
    }

    return null;
  };

  const formatHourLabel = (hour24: number): string => {
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:00 ${suffix}`;
  };

  const formatSlotRangeLabel = (slot: TimeSlotItem): string => {
    const startHour = Number(slot.start_time.slice(0, 2));
    const endHour = Number(slot.end_time.slice(0, 2));
    return `${formatHourLabel(startHour)} - ${formatHourLabel(endHour)}`;
  };

  const toTokens = (value: string): string[] =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const hasSpecificFutsalHint = (question: string): boolean => {
    const tokens = toTokens(question).filter((token) => !GENERIC_BOOKING_TERMS.has(token));
    return tokens.length > 0;
  };

  const hasNaturalDateHint = (question: string): boolean => {
    const q = question.toLowerCase();
    if (q.includes("today") || q.includes("tomorrow")) return true;
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(q)) return true;
    if (/\b\d{1,2}(st|nd|rd|th)?\s*(of\s*)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/.test(q)) return true;
    if (/\b\d{1,2}(st|nd|rd|th)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/.test(q)) return true;
    return false;
  };

  const isCompactBookingInput = (question: string): boolean => {
    const q = question.toLowerCase();
    const hasBookingKeyword = /\bbook(ing)?\b/.test(q);
    if (hasBookingKeyword) return false;

    const hasTime = parseHourFromQuestion(question) !== null;
    const hasDate = hasNaturalDateHint(question);
    const hasFutsal = hasSpecificFutsalHint(question);
    const hasCompactShape = q.includes(",") || q.split(/\s+/).filter(Boolean).length <= 7;

    return hasCompactShape && hasFutsal && hasDate && hasTime;
  };

  const getFutsalMatchesFromQuestion = (question: string, futsals: FutsalItem[]): FutsalItem[] => {
    const q = question.toLowerCase();
    const questionTokens = toTokens(question);

    return futsals
      .map((futsal) => {
        const name = futsal.futsal_name.toLowerCase();
        const nameTokens = toTokens(name);
        const overlapScore = questionTokens.filter((token) => nameTokens.includes(token)).length;
        const fullMatchScore = q.includes(name) ? 6 : 0;
        const containsQuestionScore = q.length >= 4 && name.includes(q.trim()) ? 4 : 0;
        const score = overlapScore + fullMatchScore + containsQuestionScore;
        return { futsal, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.futsal);
  };

  const findSlotAtHour = (slots: TimeSlotItem[], hour24: number): TimeSlotItem | null => {
    return slots.find((slot) => {
      const startHour = Number(slot.start_time.slice(0, 2));
      const endHour = Number(slot.end_time.slice(0, 2));
      return slot.availability_status === "available" && hour24 >= startHour && hour24 < endHour;
    }) || null;
  };

  const buildResponse = async (question: string): Promise<Omit<ChatMessage, "id" | "role">> => {
    const q = question.toLowerCase();
    const bookingIntent = q.includes("book") || isCompactBookingInput(question);

    if (/\b(hello|hi|hey|namaste|how are you|good morning|good evening)\b/.test(q)) {
      return {
        text: "Hello! I am doing great. I can help you check futsal availability, book slots, payment options, and find opponents.",
      };
    }

    const availabilityIntent =
      q.includes("available") ||
      q.includes("availability") ||
      q.includes("price") ||
      q.includes("slot") ||
      q.includes("which futsal") ||
      q.includes("what time") ||
      q.includes("which time");

    if (q.includes("how do i book futsal") || q.includes("how to book futsal") || q === "book futsal") {
      return {
        text: "To book from chat: 1) tell futsal name, 2) tell date, 3) tell time. Example: Book Dhuku Sports Hub tomorrow at 6 PM.",
        ctaLabel: "Open Search",
        ctaRoute: "/search",
      };
    }

    if (availabilityIntent) {
      const date = getIsoDateFromQuestion(question);
      const hour = parseHourFromQuestion(question);
      const futsals = await getFutsals();
      const approvedFutsals = futsals.filter((f) => f.approval_status === "approved");
      const futsalMatches = getFutsalMatchesFromQuestion(question, approvedFutsals);
      const scopedFutsals = futsalMatches.length > 0 ? futsalMatches : approvedFutsals;

      if (approvedFutsals.length === 0) {
        return {
          text: "No approved futsals are available right now. Please check again later.",
          ctaLabel: "Open Search",
          ctaRoute: "/search",
        };
      }

      const checks = await Promise.all(
        scopedFutsals.map(async (futsal) => {
          const slots = await getSlots({ futsal: futsal.id, slotDate: date });
          const available = slots.filter((slot) => slot.availability_status === "available");
          const picked = hour === null ? available[0] || null : findSlotAtHour(available, hour);
          return { futsal, picked };
        }),
      );

      const matched = checks.filter((item) => item.picked);

      if (!matched.length) {
        const timeLabel = hour === null ? "" : ` around ${formatHourLabel(hour)}`;
        if (futsalMatches.length > 0) {
          return {
            text: `${futsalMatches[0].futsal_name} has no available slot on ${date}${timeLabel}. Try another time or date.`,
            ctaLabel: "Open Futsal",
            ctaRoute: `/futsal/${futsalMatches[0].id}`,
          };
        }
        return {
          text: `No futsal slots are available on ${date}${timeLabel}. Try another time or date.`,
          ctaLabel: "Browse All Futsals",
          ctaRoute: "/search",
        };
      }

      const lines = matched.slice(0, 4).map(({ futsal, picked }) => {
        const start = picked?.start_time.slice(0, 5) || "--:--";
        const end = picked?.end_time.slice(0, 5) || "--:--";
        const price = picked?.price || "0";
        return `- ${futsal.futsal_name}: ${start}-${end}, NPR ${price}`;
      });

      return {
        text: `Available slots for ${date}${hour !== null ? ` around ${formatHourLabel(hour)}` : ""}:\n${lines.join("\n")}`,
        ctaLabel: "Open Search to choose exact slot",
        ctaRoute: "/search",
      };
    }

    if (bookingIntent) {
      if (user?.role !== "player") {
        return {
          text: "Only player accounts can create bookings from chat.",
        };
      }

      const date = getIsoDateFromQuestion(question);
      const hour = parseHourFromQuestion(question);
      const futsals = await getFutsals();
      const approvedFutsals = futsals.filter((f) => f.approval_status === "approved");
      const futsalMatches = getFutsalMatchesFromQuestion(question, approvedFutsals);
      const targetFutsal = futsalMatches[0] || null;

      if (!hasSpecificFutsalHint(question)) {
        const sampleNames = approvedFutsals.slice(0, 3).map((f) => f.futsal_name).join(", ");
        return {
          text: `Great, please include the futsal name. For example: Book ${sampleNames || "a futsal"} tomorrow at 6 PM.`,
          ctaLabel: "Open Search",
          ctaRoute: "/search",
        };
      }

      if (!targetFutsal) {
        return {
          text: "Great, please include the futsal name. Example: Book Dhuku Sports Arena tomorrow at 6 PM.",
          ctaLabel: "Open Search",
          ctaRoute: "/search",
        };
      }

      const slots = await getSlots({ futsal: targetFutsal.id, slotDate: date });
      const availableSlots = slots.filter((slot) => slot.availability_status === "available");

      if (hour === null) {
        if (!availableSlots.length) {
          return {
            text: `I found ${targetFutsal.futsal_name}, but there are no available slots on ${date}.`,
            ctaLabel: "Pick Another Date",
            ctaRoute: `/futsal/${targetFutsal.id}`,
          };
        }

        const slotLines = availableSlots
          .slice(0, 6)
          .map((slot) => `- ${formatSlotRangeLabel(slot)} (NPR ${slot.price})`)
          .join("\n");
        return {
          text: `I found ${targetFutsal.futsal_name}. Available times on ${date}:\n${slotLines}\nPlease reply with a time to book.`,
        };
      }

      const matchingSlot = findSlotAtHour(slots, hour);

      if (!matchingSlot) {
        return {
          text: `${targetFutsal.futsal_name} has no available slot at ${formatHourLabel(hour)} on ${date}.`,
          ctaLabel: "Pick Another Slot",
          ctaRoute: `/futsal/${targetFutsal.id}`,
        };
      }

      await createBooking(matchingSlot.id);
      return {
        text: `Booked successfully: ${targetFutsal.futsal_name} on ${date} (${matchingSlot.start_time.slice(0, 5)}-${matchingSlot.end_time.slice(0, 5)}), NPR ${matchingSlot.price}.`,
        ctaLabel: "Open My Bookings",
        ctaRoute: "/my-bookings",
      };
    }

    if (q.includes("booking") && (q.includes("summary") || q.includes("my"))) {
      const bookings = await getMyBookings();
      const upcoming = bookings.filter((b) => b.booking_status !== "cancelled" && b.slot_details.slot_date >= new Date().toISOString().slice(0, 10)).length;
      return {
        text: `You have ${bookings.length} total bookings and ${upcoming} upcoming booking(s).`,
        ctaLabel: "Open My Bookings for details",
        ctaRoute: "/my-bookings",
      };
    }

    if (q.includes("opponent") || q.includes("opponet") || q.includes("opponen") || q.includes("find opponents")) {
      const posts = await getOpponentPosts();
      const openPosts = posts.filter((p) => p.status === "open").length;
      return {
        text: `Opponent Finder currently has ${openPosts} open request(s). You can post your own request in Find Opponents.`,
        ctaLabel: "Open Find Opponents",
        ctaRoute: "/find-opponents",
      };
    }

    if (q.includes("pay") || q.includes("payment")) {
      return {
        text: "When you click Book Now, you can choose either Pay Advance (eSewa) or Pay at Venue. Payment status appears in My Bookings.",
      };
    }

    if (q.includes("cancel")) {
      return {
        text: "Go to My Bookings, open an upcoming booking, and click Cancel Booking. If already paid online, refund rules depend on booking status and policy.",
      };
    }

    if (q.includes("refund")) {
      return {
        text: "For online advance payment, cancellation may move payment status to refunded based on booking state. You can check status in My Bookings.",
      };
    }

    if (q.includes("profile") || q.includes("name") || q.includes("photo")) {
      return {
        text: "Open Profile to update your name, email, phone, and profile picture. Changes are saved to your account immediately.",
        ctaLabel: "Open Profile",
        ctaRoute: "/profile",
      };
    }

    if (q.includes("notification")) {
      return {
        text: "Use the bell icon in the top bar to view latest notifications and jump to related pages.",
      };
    }

    return {
      text: "I can help with bookings, payments, profile updates, and opponent finder. Try one of the quick prompts above.",
    };
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const isShortFollowupName =
      pendingBookingContext !== null &&
      trimmed.split(/\s+/).length <= 3 &&
      !/\b(book|booking|available|availability|slot|time|today|tomorrow|payment|profile|notification|refund|cancel|opponent|hello|hi|hey)\b/i.test(trimmed);

    const effectiveInput = isShortFollowupName
      ? `Which futsal ${trimmed} is available on ${pendingBookingContext.date}${
          pendingBookingContext.hour !== null ? ` at ${formatHourLabel(pendingBookingContext.hour)}` : ""
        }?`
      : trimmed;

    if (/^[0-9]{1,3}$/.test(trimmed)) {
      appendMessage({
        role: "assistant",
        text: "Please send a clear question (for example: Which futsal is available today at 6 PM?).",
      });
      return;
    }

    if (cooldownRemaining > 0) {
      appendMessage({
        role: "assistant",
        text: `Please wait ${cooldownRemaining}s before sending another message.`,
      });
      return;
    }

    appendMessage({ role: "user", text: trimmed });
    setInput("");
    setCooldownRemaining(COOLDOWN_SECONDS);

    try {
      setLoading(true);
      const llmHistory = messages
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.text,
        }));

      try {
        const aiResult = await askAiAssistant(effectiveInput, llmHistory);
        if (aiResult.reply?.trim()) {
          appendMessage({ role: "assistant", text: aiResult.reply.trim() });
          if (isShortFollowupName) {
            setPendingBookingContext(null);
          }
          return;
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "AI service unavailable";
        appendMessage({
          role: "assistant",
          text: `AI assistant is temporarily unavailable (${detail}). Please try again in a moment.`,
        });
        return;
      }

      appendMessage({
        role: "assistant",
        text: "AI assistant returned an empty reply. Please ask again.",
      });
    } catch {
      appendMessage({ role: "assistant", text: "I could not load that right now. Please try again in a moment." });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  if (isPageMode) {
    return (
      <div className="w-full py-6 md:py-8">
          <h1 className="mb-1">AI Chat Assistant</h1>
          <p className="text-muted-foreground mb-7">Ask about availability, booking, prices, and your account actions.</p>

          <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
            <aside className="bg-white border border-border rounded-2xl p-5 md:p-6 shadow-sm space-y-3">
              <h3 className="text-lg">Quick Actions</h3>
              <button onClick={() => navigate("/my-bookings")} className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-muted text-sm">
                <CalendarDays className="w-4 h-4" /> My Bookings
              </button>
              <button onClick={() => navigate("/find-opponents")} className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-muted text-sm">
                <Swords className="w-4 h-4" /> Find Opponents
              </button>
              <button onClick={() => navigate("/search")} className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-muted text-sm">
                <Wallet className="w-4 h-4" /> Book a Court
              </button>

              <div className="pt-2 border-t border-border">
                <p className="mb-2 text-xs uppercase tracking-[0.05em] text-muted-foreground">FAQ (Frequently Asked Questions)</p>
                <div className="space-y-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => void sendMessage(prompt)}
                      className="w-full rounded-xl bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <p className="font-semibold">Virtual Assistant</p>
              </div>

              <div className="p-5 md:p-6 space-y-3 min-h-[420px] max-h-[60vh] overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {message.role === "assistant" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.04em] mb-1 text-primary">
                          <Sparkles className="w-3 h-3" /> Assistant
                        </span>
                      ) : null}
                      <p className="whitespace-pre-line">{message.text}</p>
                      {message.role === "assistant" && message.ctaRoute && message.ctaLabel ? (
                        <button
                          type="button"
                          onClick={() => navigate(message.ctaRoute as string)}
                          className="mt-2 text-sm font-medium text-primary underline underline-offset-2"
                        >
                          {message.ctaLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {loading ? (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3 text-sm inline-flex items-center gap-2">
                      <MessageSquarePlus className="w-4 h-4 text-primary" /> Thinking...
                    </div>
                  </div>
                ) : null}
              </div>

              <form onSubmit={onSubmit} className="p-4 border-t border-border flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask booking, time, price..."
                  className="flex-1 rounded-xl border border-border px-3 py-2.5"
                />
                <button
                  type="submit"
                  disabled={loading || cooldownRemaining > 0 || !input.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <SendHorizonal className="w-4 h-4" /> {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : "Send"}
                </button>
              </form>
            </section>
          </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[1200]">
      {isOpen ? (
        <section className="w-[94vw] sm:w-[460px] h-[min(74vh,620px)] bg-white border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <p className="font-semibold">Virtual Assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-muted"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-border grid grid-cols-3 gap-2">
            <button onClick={() => navigate("/search")} className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl border border-border hover:bg-muted text-xs">
              <Wallet className="w-3.5 h-3.5" /> Courts
            </button>
            <button onClick={() => navigate("/find-opponents")} className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl border border-border hover:bg-muted text-xs">
              <Swords className="w-3.5 h-3.5" /> Opponents
            </button>
            <button onClick={() => navigate("/my-bookings")} className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl border border-border hover:bg-muted text-xs">
              <CalendarDays className="w-3.5 h-3.5" /> Bookings
            </button>
          </div>

          <div className="px-4 pt-3 pb-2 border-b border-border">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.05em] text-muted-foreground">FAQ (Frequently Asked Questions)</p>
              <button
                type="button"
                onClick={() => navigate("/player/chatbot")}
                className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <span className="inline-flex w-full items-center justify-between gap-1.5">
                    <span>{prompt}</span>
                    <SendHorizonal className="h-3 w-3 shrink-0 text-primary" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {message.role === "assistant" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em] mb-1 text-primary">
                      <Sparkles className="w-3 h-3" /> Assistant
                    </span>
                  ) : null}
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.role === "assistant" && message.ctaRoute && message.ctaLabel ? (
                    <button
                      type="button"
                      onClick={() => navigate(message.ctaRoute as string)}
                      className="mt-2 text-sm font-medium text-primary underline underline-offset-2"
                    >
                      {message.ctaLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 text-sm inline-flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-primary" /> Thinking...
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="p-3 border-t border-border flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask booking, time, price..."
              className="flex-1 rounded-xl border border-border px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading || cooldownRemaining > 0 || !input.trim()}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1"
            >
              <SendHorizonal className="w-4 h-4" /> {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : "Send"}
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-3 ml-auto h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 inline-flex items-center justify-center"
        aria-label="Open virtual assistant"
      >
        <Bot className="w-6 h-6" />
      </button>
    </div>
  );
}
