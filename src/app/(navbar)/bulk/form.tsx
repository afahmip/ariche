"use client";

import RecordForm, { RecordFormSchema } from "@/components/ui/record-form";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { idrFormat } from "@/lib/currency";
import { Database } from "@/lib/supabase.types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, PlusIcon, ReceiptTextIcon } from "lucide-react";
import { DateTime } from "luxon";
import React, { useRef, useState } from "react";
import { useMutation, useQuery } from "react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const OpenAIData = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      qty: z.number(),
      price: z.number(),
      subtotal: z.number(),
    })
  ),
  subtotal: z.number(),
  date: z.string(),
});

type OpenAIData = z.infer<typeof OpenAIData>;

const Record = z.object({
  temp_id: z.string(),
  account_id: z.number().nullable(),
  category_id: z.number().nullable(),
  created_at: z.string(),
  decimal_amount: z.number().optional(),
  main_amount: z.number(),
  notes: z.string().optional(),
  transacted_at: z.string(),
  is_expense: z.boolean(),
});

type Record = z.infer<typeof Record>;

export default function BulkUploadForm() {
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [showAddItemSheet, setShowAddItemSheet] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .throwOnError();
      if (error) return [];
      return data;
    },
    enabled: true,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setReceipt(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (imageUrl: string) => {
    if (image) {
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                'Give concise, straightforward answers without useless sentences. Use this JSON format: {"items":[{"name":"name","category":"category","qty":3,"price":1000,"subtotal":3000}],"subtotal":3000,"date":"2024-04-10T14:47:00.604823+00:00"}. The categories are: Food, Subscription, Shopping, Transportation. Change the item names into the nearest correct names, without acronyms etc, in Bahasa Indonesia.',
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Parse this receipt using the given instruction.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          const rawContent = data?.choices?.[0]?.message.content ?? "";

          // Extract content from the enclosing "```json ... ```"
          let rawContentString = "";
          if (rawContent.startsWith("```json")) {
            rawContentString = rawContent.replace("```json", "");
          }
          if (rawContent.endsWith("\n```")) {
            rawContentString = rawContentString.slice(
              0,
              rawContentString.length - 4
            );
          }
          const openAIData = OpenAIData.parse(JSON.parse(rawContentString));

          // Parse raw content into Record object
          const createdAt = DateTime.now().setZone("Asia/Jakarta").toISO();
          const transactedAt = DateTime.fromISO(openAIData.date).toISO();
          const openAIRecords: Record[] = openAIData.items.map((it) => {
            const category = (categories || []).find(
              (cat) => cat.label === it.category
            );
            const mainAmount = Math.trunc(it.subtotal);
            const decimalAmount = Math.trunc((it.subtotal - mainAmount) * 100);

            return {
              temp_id: crypto.randomUUID(),
              created_at: createdAt || "",
              transacted_at: transactedAt || "",
              account_id: 0,
              category_id: category?.id || 0,
              main_amount: mainAmount,
              decimal_amount: decimalAmount,
              notes: it.name || "",
              is_expense: true,
            };
          });
          const newRecords = [...records, ...openAIRecords];
          setRecords(newRecords);
          setLoading(false);
          deleteReceipt();
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
        });
    }
  };

  const deleteReceipt = () => setReceipt(null);

  const { mutate: uploadReceipt } = useMutation({
    mutationFn: async () => {
      if (!image) return;
      setLoading(true);
      const supabase = createClientComponentClient<Database>();
      const { data: fileData, error: fileError } = await supabase.storage
        .from("receipts")
        .upload("test3.png", image, {
          cacheControl: "3600",
          upsert: true,
        });
      if (fileError) {
        console.error(fileError);
        return;
      }

      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(fileData.path, 600);
      if (error) {
        console.error(error);
      }
      if (data?.signedUrl) {
        handleSubmit(data?.signedUrl);
      }
    },
  });

  const updateRecord = (tempId: string, values: RecordFormSchema) => {
    setRecords((prevState) => {
      return prevState.map((it) => {
        if (it.temp_id === tempId) {
          return {
            ...it,
            category_id: values.categoryId,
            account_id: values.accountId,
            notes: values.notes,
            main_amount: values.mainAmount,
            decimal_amount: values.decimalAmount,
            transacted_at: DateTime.fromJSDate(values.date).toISO()!,
          };
        }
        return it;
      });
    });
  };

  const onAddRecord = (values: RecordFormSchema) => {
    const newRecord: Record = {
      temp_id: crypto.randomUUID(),
      created_at: DateTime.now().toISO(),
      transacted_at: DateTime.fromJSDate(values.date).toISO()!,
      account_id: values.accountId,
      category_id: values.categoryId,
      main_amount: values.mainAmount,
      decimal_amount: values.decimalAmount,
      notes: values.notes,
      is_expense: true,
    };
    const newRecords = [...records, newRecord];
    setRecords(newRecords);
    setShowAddItemSheet(false);
  };

  return (
    <div className="flex flex-col pt-4 items-center h-[90vh]">
      <input
        ref={receiptInputRef}
        className="invisible w-0 h-0 absolute z-0"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        onClick={(e: any) => {
          const element = e.target as HTMLInputElement;
          element.value = "";
        }}
      />
      <Dialog
        open={!!receipt}
        onOpenChange={(val: boolean) => {
          if (isLoading) return;
          if (!val) deleteReceipt();
        }}
      >
        <DialogContent className="w-[95%] rounded-md">
          <DialogHeader />
          {receipt && (
            <>
              <img src={receipt} alt="Preview" className="rounded-md" />
              <div className="flex flex-col space-y-1.5">
                <Button
                  variant="outline"
                  onClick={deleteReceipt}
                  disabled={isLoading}
                >
                  Delete Receipt
                </Button>
                <Button onClick={() => uploadReceipt()} disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Analyze Receipt
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <div className="mb-4 w-full flex flex-col space-y-2 px-4">
        {records.map((item) => (
          <RecordItem
            item={item}
            categories={categories || []}
            update={(val) => updateRecord(item.temp_id, val)}
          />
        ))}
      </div>
      <div className="px-4 w-full flex flex-col items-center space-y-1">
        <button
          type="button"
          onClick={() => receiptInputRef.current?.click()}
          className="border-dashed border border-gray-500 text-[#0177FF] font-medium py-3 px-4 block rounded-md w-full flex items-center justify-center"
        >
          <ReceiptTextIcon className="mr-1" /> Upload Receipt
        </button>
        <p className="font-medium">or</p>
        <Sheet open={showAddItemSheet} onOpenChange={setShowAddItemSheet}>
          <SheetTrigger className="border-dashed border border-gray-500 text-[#0177FF] font-medium py-3 px-4 block rounded-md w-full flex items-center justify-center">
            <PlusIcon className="mr-1" /> Add Item
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-scroll px-0">
            <RecordForm onSubmit={onAddRecord} submitText="Add Item" />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function RecordItem({
  item,
  categories,
  update,
}: {
  item: Record;
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  update: (values: RecordFormSchema) => void;
}) {
  const [open, setOpen] = useState(false);

  const onUpdate = (values: RecordFormSchema) => {
    update(values);
    setOpen(false);
  };

  return (
    <Sheet key={item.temp_id} open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex">
        <div className="w-10 shrink-0 pt-2 flex items-start">
          <p className="text-3xl">
            {categories?.find((cat) => cat.id === item.category_id)?.icon}
          </p>
        </div>
        <div className="w-full flex pt-2 space-x-3 border-t border-dashed">
          <div className="w-full flex flex-col items-start text-left">
            <p className="font-medium text-sm">
              {categories?.find((cat) => cat.id === item.category_id)?.label}
            </p>
            <p className="text-sm text-gray-500">{item.notes}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-sm whitespace-nowrap">
              {idrFormat(`${item.main_amount}.${item.decimal_amount}`)}
            </p>
            <p className="text-sm whitespace-nowrap text-gray-500">BCA</p>
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-scroll px-0">
        <RecordForm
          initialValue={{
            mainAmount: item.main_amount,
            decimalAmount: item.decimal_amount,
            notes: item.notes || "",
            isExpense: item.is_expense,
            date: DateTime.fromISO(item.transacted_at).toJSDate(),
            accountId: item.account_id ?? 0,
            categoryId: item.category_id ?? 0,
          }}
          onSubmit={onUpdate}
          submitText="Update"
        />
      </SheetContent>
    </Sheet>
  );
}
