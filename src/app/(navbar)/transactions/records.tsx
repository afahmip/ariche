"use client";

import { idrFormat } from "@/lib/currency";
import { Database } from "@/lib/supabase.types";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import _ from "lodash";
import { Search } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import Fuse from "fuse.js";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import RecordForm, { RecordFormSchema } from "@/components/ui/record-form";

enum Duration {
  Week = "week",
  Month = "month",
  Year = "year",
}

type Record = {
  account_id: number | null;
  category_id: number | null;
  created_at: string;
  decimal_amount: number;
  id: number;
  main_amount: number;
  notes: string | null;
  transacted_at: string;
  is_expense: boolean;
  categories: Database["public"]["Tables"]["categories"]["Row"] | null;
  accounts: Database["public"]["Tables"]["accounts"]["Row"] | null;
};

type RecordGroup = {
  label: string;
  totalAmount: number;
  rows: Record[];
};

export default function Records() {
  const [duration, setDuration] = useState(Duration.Week);
  const [query, setQuery] = useState("");

  const { data } = useQuery({
    queryKey: ["transactions-data"],
    queryFn: async () => {
      const supabase = createClientComponentClient<Database>();
      const { data: rawExpenses } = await supabase
        .from("expenses")
        .select(`*, categories(*), accounts(*)`)
        .order("transacted_at", { ascending: false })
        .throwOnError();
      const expenses = (rawExpenses ?? []).map((row) => ({
        ...row,
        is_expense: true,
      }));

      const { data: rawIncomes } = await supabase
        .from("incomes")
        .select(`*, categories(*), accounts(*)`)
        .order("transacted_at", { ascending: false })
        .throwOnError();
      const incomes = (rawIncomes ?? []).map((row) => ({
        ...row,
        is_expense: false,
      }));

      return _.orderBy([...expenses, ...incomes], "transacted_at", "desc");
    },
    refetchOnWindowFocus: false,
    enabled: true,
  });
  const rawRecords = data ?? [];
  const records = (
    !query
      ? rawRecords
      : new Fuse(rawRecords, {
          threshold: 0.4,
          keys: ["notes", "accounts.name"],
        })
          .search(query)
          .map((it) => it.item)
  ).filter((row) => {
    const now = DateTime.now();
    const start = now.startOf(duration);
    const end = now.endOf(duration);
    const date = DateTime.fromISO(row.transacted_at);
    return date >= start && date <= end;
  });

  const getRecordGroups = () => {
    const result: RecordGroup[] = [];
    const map: { [label: string]: { index: number; rows: Record[] } } = {};
    let index = 0;

    records.forEach((row) => {
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

    let sorted: { index: number; label: string; rows: Record[] }[] = [];
    Object.entries(map).forEach(([label, item]) =>
      sorted.push({ ...item, label })
    );
    sorted = _.sortBy(sorted, ["index"]);

    sorted.forEach((item) => {
      const totalAmount = item.rows.reduce(
        (acc, it) =>
          acc +
          parseFloat(
            `${it.is_expense ? "-" : ""}${it.main_amount}.${it.decimal_amount}`
          ),
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
      <div className="flex items-center space-x-2 border border-gray-300 rounded-lg pl-2 overflow-hidden mb-2">
        <Search className="h-4 w-4" />
        <input
          type="text"
          placeholder="Cari di sini"
          className="text-sm h-8 w-full focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
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
      {getRecordGroups().map((group) => (
        <div className="flex flex-col space-y-2 mb-6">
          <div className="flex">
            <div className="w-10 shrink-0" />
            <p className="text-sm font-semibold w-full">{group.label}</p>
            <p
              className={cn(
                "text-sm font-semibold whitespace-nowrap",
                group.totalAmount < 0 ? "text-orange-600" : "text-green-600"
              )}
            >
              {idrFormat(group.totalAmount)}
            </p>
          </div>
          {group.rows.map((row) => (
            <RecordItem item={row} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RecordItem({ item }: { item: Record }) {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const getTableName = (isExpense: boolean) =>
    isExpense ? "expenses" : "incomes";

  const { mutate: update, isLoading: isUpdating } = useMutation({
    mutationFn: async (values: RecordFormSchema) => {
      if (!values.id) return;

      const supabase = createClientComponentClient<Database>();
      if (values.isExpense === item.is_expense) {
        const tableName = getTableName(values.isExpense);
        await supabase
          .from(tableName)
          .update({
            category_id: values.categoryId,
            account_id: values.accountId,
            notes: values.notes,
            main_amount: values.mainAmount,
            decimal_amount: values.decimalAmount,
            transacted_at: DateTime.fromJSDate(values.date).toSQL()!,
          })
          .eq("id", values.id)
          .throwOnError();
      } else {
        const oldTableName = getTableName(item.is_expense);
        const newTableName = getTableName(values.isExpense);

        await supabase
          .from(oldTableName)
          .delete()
          .eq("id", values.id)
          .throwOnError();

        await supabase
          .from(newTableName)
          .insert({
            category_id: values.categoryId,
            account_id: values.accountId,
            notes: values.notes,
            main_amount: values.mainAmount,
            decimal_amount: values.decimalAmount,
            transacted_at: DateTime.fromJSDate(values.date).toSQL()!,
          })
          .throwOnError();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions-data"]);
      setOpen(false);
    },
  });

  return (
    <Sheet key={item.id} open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex">
        <div className="w-10 shrink-0 pt-2 flex items-start">
          <p className="text-3xl">{item.categories?.icon}</p>
        </div>
        <div className="w-full flex pt-2 space-x-3 border-t border-dashed">
          <div className="w-full flex flex-col items-start text-left">
            <p className="font-medium text-sm">{item.categories?.label}</p>
            <p className="text-sm text-gray-500">{item.notes}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-sm whitespace-nowrap">
              {item.is_expense ? "-" : ""}
              {idrFormat(`${item.main_amount}.${item.decimal_amount}`)}
            </p>
            <p className="text-sm whitespace-nowrap text-gray-500">
              {item.accounts?.name}
            </p>
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-scroll px-0">
        <RecordForm
          initialValue={{
            id: item.id,
            mainAmount: item.main_amount,
            decimalAmount: item.decimal_amount,
            notes: item.notes || "",
            isExpense: item.is_expense,
            date: DateTime.fromISO(item.transacted_at).toJSDate(),
            accountId: item.account_id ?? 0,
            categoryId: item.category_id ?? 0,
          }}
          onSubmit={(values) => update(values)}
          isSubmitting={isUpdating}
          submitText="Update"
        />
      </SheetContent>
    </Sheet>
  );
}
