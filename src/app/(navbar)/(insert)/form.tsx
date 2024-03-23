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
import { cn } from "@/lib/utils";
import { CalendarDays, CheckCircle, Landmark, Wallet } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";

export default function RecordForm() {
  const [amount, setAmount] = useState(0);
  const [displayAmount, setDisplayAmount] = useState<KeypadAmountData>({
    main: "0",
    decimal: "",
  });
  const categories = [
    {
      icon: "📆",
      label: "Subscription",
    },
    {
      icon: "🍖",
      label: "Food",
    },
    {
      icon: "🛍️",
      label: "Shopping",
    },
    {
      icon: "🚈",
      label: "Transportation",
    },
  ];
  const accounts = [
    {
      name: "Gopay",
      maskedNumber: "0819****1101",
      type: "wallet",
      owner: "Fahmi",
    },
    {
      name: "OVO",
      maskedNumber: "0819****1101",
      type: "wallet",
      owner: "Fahmi",
    },
    {
      name: "BCA",
      maskedNumber: "8891*****091",
      type: "bank",
      owner: "Fahmi",
    },
    {
      name: "Mandiri",
      maskedNumber: "8891*****091",
      type: "bank",
      owner: "Fahmi",
    },
  ];

  const [openCategories, setOpenCategories] = useState(false);
  const [openAccounts, setOpenAccounts] = useState(false);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [category, setCategory] = useState(categories[0]);
  const [account, setAccount] = useState(accounts[0]);
  const [isExpense, setIsExpense] = useState(true);

  return (
    <div className="flex flex-col justify-center items-center p-4 pt-6">
      <div className="border border-gray-900 rounded-xl w-full mb-4 flex overflow-hidden">
        <button
          className={cn(
            "basis-1/2 py-2 flex items-center justify-center space-x-1",
            !isExpense && "bg-gray-900 text-white"
          )}
          onClick={() => setIsExpense(false)}
        >
          {!isExpense && <CheckCircle className="text-white h-4 w-4" />}
          <p className="text-sm">Income</p>
        </button>
        <button
          className={cn(
            "basis-1/2 py-2 flex items-center justify-center space-x-1",
            isExpense && "bg-gray-900 text-white"
          )}
          onClick={() => setIsExpense(true)}
        >
          {isExpense && <CheckCircle className="text-white h-4 w-4" />}
          <p className="text-sm">Expense</p>
        </button>
      </div>
      <div className="bg-gray-900 w-full rounded-xl mb-8 px-2">
        <div className="text-white flex space-x-2 px-3 rounded-lg items-center w-full">
          <Sheet open={openAccounts} onOpenChange={setOpenAccounts}>
            <SheetTrigger className="flex items-center justify-center space-x-1 basis-1/2 py-3">
              {account.type === "wallet" && (
                <Wallet className="h-4 w-4 text-white" />
              )}
              {account.type === "bank" && (
                <Landmark className="h-4 w-4 text-white" />
              )}
              <p className="text-sm">
                {account.name} {account.owner}
              </p>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetTitle className="mb-1">Choose account</SheetTitle>
              <div className="flex flex-col items-start">
                {accounts.map((acc) => (
                  <button
                    key={`${acc.name}-${acc.owner}`}
                    className={cn(
                      "flex items-center space-x-2 p-2 w-full",
                      acc.name === account.name &&
                        acc.owner === account.owner &&
                        "bg-slate-200 rounded-lg"
                    )}
                    onClick={() => {
                      setAccount(acc);
                      setOpenAccounts(false);
                    }}
                  >
                    {acc.type === "wallet" && <Wallet className="h-4 w-4" />}
                    {acc.type === "bank" && <Landmark className="h-4 w-4" />}
                    <p>
                      {acc.name} {acc.owner}
                    </p>
                    <p className="text-gray-600">{acc.maskedNumber}</p>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Separator className="h-7 bg-gray-600" orientation="vertical" />
          <Sheet open={openCategories} onOpenChange={setOpenCategories}>
            <SheetTrigger className="basis-1/2 text-sm py-3">
              {category.icon}&nbsp;&nbsp;{category.label}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetTitle className="mb-1">Choose category</SheetTitle>
              <div className="flex flex-col items-start">
                {categories.map((cat) => (
                  <button
                    key={cat.label}
                    className={cn(
                      "p-2 w-full text-left",
                      cat.label === category.label && "bg-slate-200 rounded-lg"
                    )}
                    onClick={() => {
                      setCategory(cat);
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
        <Popover>
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
              onSelect={setDate}
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Keypad
        onChange={(val) => setAmount(val)}
        onDisplayChange={(val) => setDisplayAmount(val)}
      />
      <Button className="w-full h-[65px] text-lg">Record</Button>
    </div>
  );
}

type KeypadAmountData = {
  main: string;
  decimal: string;
};

function KeypadAmount({ data }: { data: KeypadAmountData }) {
  return (
    <div className="flex mb-4">
      <p className="font-semibold text-4xl mr-1 text-gray-500">Rp</p>
      <p className="font-semibold text-6xl">{data.main}</p>
      <p className="font-semibold text-5xl self-end text-gray-500">
        {data.decimal}
      </p>
    </div>
  );
}

function Keypad(props: {
  onChange: (val: number) => void;
  onDisplayChange: (val: KeypadAmountData) => void;
}) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    props.onChange(amount ? parseFloat(amount.replace(",", ".")) : 0);
    props.onDisplayChange(renderAmount(amount));
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

  const renderButtons = () => {
    const buttons = [];
    const buttonClass = "basis-2/6 text-2xl h-[80px] font-medium";
    for (let i = 1; i <= 9; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handleKeyPress(i)}
          className={buttonClass}
        >
          {i}
        </button>
      );
    }
    buttons.push(
      <button
        key=","
        onClick={() => handleKeyPress(",")}
        className={buttonClass}
      >
        ,
      </button>,
      <button key={0} onClick={() => handleKeyPress(0)} className={buttonClass}>
        0
      </button>,
      <button
        key="C"
        onClick={() => handleKeyPress("C")}
        className={buttonClass}
      >
        C
      </button>
    );
    return buttons;
  };

  const renderAmount = (amount: string): KeypadAmountData => {
    if (!amount) return { main: "0", decimal: "" };

    const amounts = amount.split(",");
    const mainAmount = amounts[0].split("").reverse().join("");
    let decimalAmount = "";
    if (amounts.length > 1) {
      decimalAmount = amounts[1];
    }

    const mainAmountDisplay: string[] = [];
    for (let i = 0; i < mainAmount.length; i += 3) {
      mainAmountDisplay.push(
        mainAmount
          .slice(i, i + 3)
          .split("")
          .reverse()
          .join("")
      );
    }
    mainAmountDisplay.reverse();
    return {
      main: mainAmountDisplay.join("."),
      decimal: decimalAmount ? `,${decimalAmount}` : "",
    };
  };

  return <div className="flex flex-wrap w-full mb-2">{renderButtons()}</div>;
}
