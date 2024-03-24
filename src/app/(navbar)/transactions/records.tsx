"use client";

import { idrFormat } from "@/lib/currency";
import { Database } from "@/lib/supabase.types";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import _ from "lodash";
import { DateTime } from "luxon";
import { useState } from "react";
import { useQuery } from "react-query";

enum Duration {
  Week = "week",
  Month = "month",
  Year = "year",
}

type Expense = Database["public"]["Tables"]["expenses"]["Row"] & {
  categories: Database["public"]["Tables"]["categories"]["Row"] | null;
  accounts: Database["public"]["Tables"]["accounts"]["Row"] | null;
};

type ExpenseGroup = {
  label: string;
  totalAmount: number;
  rows: Expense[];
};

export default function Records() {
  const [duration, setDuration] = useState(Duration.Week);

  const { data } = useQuery({
    queryFn: async () => {
      const supabase = createClientComponentClient<Database>();
      const { data } = await supabase
        .from("expenses")
        .select(`*, categories(*), accounts(*)`)
        .order("transacted_at", { ascending: false })
        .throwOnError();
      if (!data) return [];
      return data;
    },
  });
  const expenses = (data || []).filter((row) => {
    const now = DateTime.now();
    const start = now.startOf(duration);
    const end = now.endOf(duration);
    const date = DateTime.fromISO(row.transacted_at);
    return date >= start && date <= end;
  });

  const getExpenseGroups = () => {
    const result: ExpenseGroup[] = [];
    const map: { [label: string]: { index: number; rows: Expense[] } } = {};
    let index = 0;

    expenses.forEach((row) => {
      const label = DateTime.fromISO(row.transacted_at)
        .setLocale("id-ID")
        .setZone("Asia/Jakarta")
        .toFormat("dd MMMM yyyy");
      if (!map[label]) {
        map[label] = { index, rows: [row] };
        index++;
      } else {
        const current = map[label];
        map[label] = {
          index: current.index,
          rows: [...current.rows, row],
        };
      }
    });

    let sorted: { index: number; label: string; rows: Expense[] }[] = [];
    Object.entries(map).forEach(([label, item]) =>
      sorted.push({ ...item, label })
    );
    sorted = _.sortBy(sorted, ["index"]);

    sorted.forEach((item) => {
      const totalAmount = item.rows.reduce(
        (acc, it) => acc + parseFloat(`${it.main_amount}.${it.decimal_amount}`),
        0
      );
      result.push({
        label: item.label,
        totalAmount,
        rows: item.rows,
      });
    });
    return result;
  };

  return (
    <div className="flex flex-col p-4 pt-6">
      <div className="mb-4 flex">
        {[Duration.Week, Duration.Month, Duration.Year].map((d) => (
          <button
            className={cn(
              "text-sm rounded-lg px-3 py-2 font-semibold border border-transparent text-gray-500",
              duration === d && "border-gray-600 text-black"
            )}
            onClick={() => setDuration(d)}
          >
            {_.startCase(d)}
          </button>
        ))}
      </div>
      {getExpenseGroups().map((group) => (
        <div className="flex flex-col space-y-2 mb-6">
          <div className="flex">
            <div className="w-10 shrink-0" />
            <p className="text-sm font-semibold w-full">{group.label}</p>
            <p className="text-sm font-semibold text-orange-600">
              {idrFormat(group.totalAmount)}
            </p>
          </div>
          {group.rows.map((row) => (
            <div key={row.id} className="flex">
              <div className="w-10 shrink-0 pt-2">
                <p className="text-3xl">{row.categories?.icon}</p>
              </div>
              <div className="w-full flex pt-2 space-x-3 border-t border-dashed">
                <div className="w-full">
                  <p className="font-medium text-sm">{row.categories?.label}</p>
                  <p className="text-sm text-gray-500">{row.notes}</p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-sm">
                    {idrFormat(`${row.main_amount}.${row.decimal_amount}`)}
                  </p>
                  <p className="text-sm whitespace-nowrap text-gray-500">
                    {row.accounts?.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
