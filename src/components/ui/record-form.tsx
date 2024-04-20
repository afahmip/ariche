"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { idrFormat } from "@/lib/currency";
import { Database } from "@/lib/supabase.types";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  CalendarDays,
  CheckCircle,
  Landmark,
  Loader2,
  Wallet,
} from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "react-query";
import { z } from "zod";

const RecordFormSchema = z.object({
  id: z.number().optional(),
  mainAmount: z.number().positive(),
  decimalAmount: z.number().optional(),
  notes: z.string().optional(),
  date: z.date(),
  categoryId: z.number(),
  accountId: z.number(),
  isExpense: z.boolean(),
});

export type RecordFormSchema = z.infer<typeof RecordFormSchema>;

export default function RecordForm({
  initialValue,
  onSubmit,
  onChange,
  isSubmitting,
  submitText,
}: {
  initialValue?: RecordFormSchema;
  onSubmit?: (values: RecordFormSchema) => void;
  onChange?: (values: RecordFormSchema) => void;
  isSubmitting?: boolean;
  submitText?: string;
}) {
  const [displayAmount, setDisplayAmount] = useState<KeypadAmountData>({
    main: {
      amount: 0,
      display: "0",
    },
    decimal: {
      amount: 0,
      display: "",
    },
  });
  const [openCategories, setOpenCategories] = useState(false);
  const [openAccounts, setOpenAccounts] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);

  const { data } = useQuery({
    queryKey: ["data-for-new-record"],
    queryFn: async () => {
      const supabase = createClientComponentClient<Database>();
      const [categories, accounts] = await Promise.all([
        (async () => {
          const { data } = await supabase.from("categories").select(`*`);
          if (!data) return [];
          return data;
        })(),
        (async () => {
          const { data } = await supabase.from("accounts").select(`*`);
          if (!data) return [];
          return data;
        })(),
      ]);
      return { categories, accounts };
    },
    refetchOnWindowFocus: false,
    enabled: true,
  });
  const categories = data?.categories || [];
  const accounts = data?.accounts || [];

  const form = useForm<RecordFormSchema>({
    resolver: zodResolver(RecordFormSchema),
    defaultValues: {
      id: initialValue?.id,
      mainAmount: initialValue?.mainAmount ?? 0,
      decimalAmount: initialValue?.decimalAmount,
      notes: initialValue?.notes || "",
      date: initialValue?.date ?? new Date(),
      isExpense: initialValue?.isExpense ?? true,
      accountId: initialValue?.accountId,
      categoryId: initialValue?.categoryId,
    },
  });
  const { register, handleSubmit, watch } = form;
  const formValues = watch();
  const { date, categoryId, accountId, isExpense } = formValues;
  const category = categories.find((cat) => cat.id === watch("categoryId"));
  const account = accounts.find((acc) => acc.id === accountId);

  useEffect(() => {
    onChange?.(formValues);
  }, [formValues]);

  return (
    <form
      className="flex flex-col justify-center items-center p-4 pt-6"
      onSubmit={handleSubmit((v) => onSubmit?.(v))}
    >
      <div className="border border-gray-900 rounded-xl w-full mb-4 flex overflow-hidden">
        <button
          type="button"
          className={cn(
            "basis-1/2 py-2 flex items-center justify-center space-x-1",
            !isExpense && "bg-gray-900 text-white"
          )}
          onClick={() => form.setValue("isExpense", false)}
        >
          {!isExpense && <CheckCircle className="text-white h-4 w-4" />}
          <p className="text-sm">Income</p>
        </button>
        <button
          type="button"
          className={cn(
            "basis-1/2 py-2 flex items-center justify-center space-x-1",
            isExpense && "bg-gray-900 text-white"
          )}
          onClick={() => form.setValue("isExpense", true)}
        >
          {isExpense && <CheckCircle className="text-white h-4 w-4" />}
          <p className="text-sm">Expense</p>
        </button>
      </div>
      <div className="bg-gray-900 w-full rounded-xl mb-6 px-2">
        <div className="text-white flex space-x-2 px-3 rounded-lg items-center w-full">
          <Sheet open={openAccounts} onOpenChange={setOpenAccounts}>
            <SheetTrigger className="flex items-center justify-center space-x-1 basis-1/2 py-3">
              {account ? (
                <>
                  {account?.type === "wallet" && (
                    <Wallet className="h-4 w-4 text-white" />
                  )}
                  {account?.type === "bank" && (
                    <Landmark className="h-4 w-4 text-white" />
                  )}
                  <p className="text-sm">
                    {account?.name} {account?.owner}
                  </p>
                </>
              ) : (
                <p className="text-sm">Choose account</p>
              )}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetTitle className="mb-1">Choose account</SheetTitle>
              <div className="flex flex-col items-start">
                {accounts.map((acc) => (
                  <button
                    key={`${acc.name}-${acc.owner}`}
                    type="button"
                    className={cn(
                      "flex items-center space-x-2 p-2 w-full",
                      acc.id === accountId && "bg-slate-200 rounded-lg"
                    )}
                    onClick={() => {
                      form.setValue("accountId", acc.id);
                      setOpenAccounts(false);
                    }}
                  >
                    {acc.type === "wallet" && <Wallet className="h-4 w-4" />}
                    {acc.type === "bank" && <Landmark className="h-4 w-4" />}
                    <p>
                      {acc.name} {acc.owner}
                    </p>
                    <p className="text-gray-600">{acc.masked_number}</p>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Separator className="h-7 bg-gray-600" orientation="vertical" />
          <Sheet open={openCategories} onOpenChange={setOpenCategories}>
            <SheetTrigger className="basis-1/2 text-sm py-3">
              {category ? (
                <>
                  {category.icon}&nbsp;&nbsp;{category.label}
                </>
              ) : (
                "Choose category"
              )}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetTitle className="mb-1">Choose category</SheetTitle>
              <div className="flex flex-col items-start">
                {categories.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    className={cn(
                      "p-2 w-full text-left",
                      cat.id === categoryId && "bg-slate-200 rounded-lg"
                    )}
                    onClick={() => {
                      form.setValue("categoryId", cat.id);
                      setOpenCategories(false);
                    }}
                  >
                    {cat.icon}&nbsp;&nbsp;{cat.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <Separator className="w-full bg-gray-600" />
        <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
          <PopoverTrigger className="text-white px-3 py-3 w-full flex items-center space-x-1 justify-center">
            <CalendarDays className="h-4 w-4 text-white" />
            <p className="text-sm">
              {date
                ? DateTime.fromJSDate(date)
                    .setLocale("id-ID")
                    .setZone("Asia/Jakarta")
                    .toFormat("cccc, dd LLLL yyyy")
                : ""}
            </p>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(val) => {
                if (val) {
                  form.setValue("date", val);
                  setOpenCalendar(false);
                }
              }}
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>
      </div>
      <KeypadAmount data={displayAmount} />
      <div className="flex items-center space-x-2 w-full">
        <input
          type="text"
          className="w-full whitespace-nowrap text-gray-700 bg-transparent focus-within:outline-none text-center"
          placeholder="Put notes here"
          {...register("notes")}
        />
      </div>
      <Keypad
        mainAmount={initialValue?.mainAmount?.toString()}
        decimalAmount={initialValue?.decimalAmount?.toString()}
        onChange={(val) => {
          setDisplayAmount(val);
          form.setValue("mainAmount", val.main.amount);
          form.setValue("decimalAmount", val.decimal.amount);
        }}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-[65px] flex space-x-2"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        <p className="text-lg">{submitText || "Record"}</p>
      </Button>
    </form>
  );
}

type KeypadAmountData = {
  main: {
    amount: number;
    display: string;
  };
  decimal: {
    amount: number;
    display: string;
  };
};

function KeypadAmount({ data }: { data: KeypadAmountData }) {
  return (
    <div className="flex mb-4">
      <p className="font-semibold text-4xl mr-1 text-gray-500">Rp</p>
      <p className="font-semibold text-6xl">{data.main.display}</p>
      <p className="font-semibold text-5xl self-end text-gray-500">
        {data.decimal.display}
      </p>
    </div>
  );
}

function Keypad(props: {
  mainAmount?: string;
  decimalAmount?: string;
  onChange: (val: KeypadAmountData) => void;
}) {
  const [amount, setAmount] = useState(
    props.mainAmount && props.decimalAmount
      ? `${props.mainAmount},${props.decimalAmount}`
      : props.mainAmount
      ? `${props.mainAmount}`
      : ""
  );

  useEffect(() => {
    props.onChange(renderAmount(amount.replace(",", ".")));
  }, [amount]);

  const handleKeyPress = (value: string | number) => {
    if (value === "C") {
      setAmount("");
    } else if (value === ",") {
      if (!amount.includes(",")) {
        setAmount((prevInput) => prevInput + ",");
      }
    } else {
      setAmount((prevInput) => {
        let cleanedPrevInput = prevInput;
        if (prevInput.startsWith("0") && !prevInput.includes(",")) {
          cleanedPrevInput = cleanedPrevInput.slice(1);
        }
        return cleanedPrevInput + value;
      });
    }
  };

  const renderAmount = (amount: string): KeypadAmountData => {
    if (!amount)
      return {
        main: {
          amount: 0,
          display: "0",
        },
        decimal: {
          amount: 0,
          display: "",
        },
      };

    const formatted = idrFormat(amount).replace("Rp", "").trim().split(",");
    const main = formatted[0];
    const decimal = formatted.length > 1 ? formatted[1] : "";
    console.log(main, decimal);
    return {
      main: {
        amount: parseInt(main.replaceAll(".", "")),
        display: main,
      },
      decimal: {
        amount: parseInt(decimal || "0"),
        display: decimal ? `,${decimal}` : "",
      },
    };
  };

  return (
    <div className="flex flex-wrap w-full mb-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, ",", 0, "C"].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => handleKeyPress(v)}
          className="basis-2/6 text-2xl h-[70px] font-medium"
        >
          {v}
        </button>
      ))}
    </div>
  );
}
