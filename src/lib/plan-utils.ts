import { eachDayOfInterval, getDay, parseISO } from "date-fns";
import { PlanGroup, TaskTemplate } from "@/types/trading";

export function groupTemplatesIntoPlans(templates: TaskTemplate[]): PlanGroup[] {
  if (!templates || templates.length === 0) return [];

  const groupsMap = new Map<string, TaskTemplate[]>();

  for (const t of templates) {
    if (!t.startDate || !t.endDate) continue;
    // Exclude global proof image template if it's 2020-2099
    if (t.title.toLowerCase().includes("proof") && t.startDate.startsWith("2020")) {
      continue;
    }

    const sDate = t.startDate.split("T")[0];
    const eDate = t.endDate.split("T")[0];

    // Key by planId if present, else by date window
    const key = t.planId ? `plan_${t.planId}` : `dates_${sDate}_${eDate}`;
    const list = groupsMap.get(key) || [];
    list.push(t);
    groupsMap.set(key, list);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const plans: PlanGroup[] = [];

  for (const [key, tList] of groupsMap.entries()) {
    const anchor = tList[0];
    const startDate = anchor.startDate.split("T")[0];
    const endDate = anchor.endDate.split("T")[0];
    const repeatDays = anchor.repeatDays?.length ? anchor.repeatDays : [1, 2, 3, 4, 5];

    // Find capital template
    const capTpl = tList.find((t) => {
      const title = t.title.toLowerCase();
      return (
        title.includes("depozit") ||
        title.includes("kapital") ||
        title.includes("investitsiya") ||
        title.includes("boshlang'ich") ||
        title.includes("boshlangich")
      );
    });

    // Find target balance template
    const targetTpl = tList.find((t) => {
      const title = t.title.toLowerCase();
      return (
        title.includes("maqsadli") ||
        (title.includes("umumiy") && title.includes("foyda")) ||
        title.includes("rejadagi")
      );
    });

    // Find max zarar
    const maxZararTpl = tList.find((t) => t.title.toLowerCase().includes("zarar"));
    // Find max foyda
    const maxFoydaTpl = tList.find(
      (t) =>
        t.title.toLowerCase().includes("foyda") &&
        !t.title.toLowerCase().includes("maqsadli") &&
        !t.title.toLowerCase().includes("umumiy"),
    );
    // Find max trades
    const maxTradesTpl = tList.find((t) => t.title.toLowerCase().includes("trade"));

    const initialCapital = capTpl?.defaultValue ? parseFloat(capTpl.defaultValue) || 400 : 400;
    const rawTarget = targetTpl?.defaultValue ? parseFloat(targetTpl.defaultValue) || 1000 : 1000;
    const targetBalance = rawTarget > 0 ? rawTarget : initialCapital;
    const netProfitTarget = Math.max(targetBalance - initialCapital, 0);

    const maxZarar = maxZararTpl?.defaultValue ? parseFloat(maxZararTpl.defaultValue) || 100 : 100;
    const maxFoyda = maxFoydaTpl?.defaultValue ? parseFloat(maxFoydaTpl.defaultValue) || 300 : 300;
    const maxTrades = maxTradesTpl?.defaultValue ? parseInt(maxTradesTpl.defaultValue, 10) || 3 : 3;

    // Calculate total scheduled trading days
    let totalTradingDays = 0;
    try {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      if (s <= e) {
        const days = eachDayOfInterval({ start: s, end: e });
        for (const d of days) {
          const dow = getDay(d);
          const converted = dow === 0 ? 7 : dow;
          if (repeatDays.includes(converted)) {
            totalTradingDays++;
          }
        }
      }
    } catch {
      totalTradingDays = 20;
    }
    if (totalTradingDays === 0) totalTradingDays = 20;

    const isCompleted = todayStr > endDate;
    const isCurrent = todayStr >= startDate && todayStr <= endDate;

    const title = `${totalTradingDays} kunlik reja (${startDate} — ${endDate})`;

    plans.push({
      id: anchor.planId || key,
      title,
      startDate,
      endDate,
      repeatDays,
      initialCapital,
      targetBalance,
      netProfitTarget,
      maxZarar,
      maxFoyda,
      maxTrades,
      templates: tList,
      totalTradingDays,
      isCompleted,
      isCurrent,
    });
  }

  // Sort: current active plans first, then upcoming, then recently completed
  return plans.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    return b.startDate.localeCompare(a.startDate);
  });
}
