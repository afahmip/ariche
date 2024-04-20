"use client";

import RecordForm, { RecordFormSchema } from "@/components/ui/record-form";
import { Database } from "@/lib/supabase.types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { DateTime } from "luxon";
import { useMutation } from "react-query";

export default function Form() {
  const { mutate: submit, isLoading: isSubmitting } = useMutation({
    mutationFn: async (values: RecordFormSchema) => {
      const supabase = createClientComponentClient<Database>();
      if (values.isExpense) {
        await supabase
          .from("expenses")
          .insert({
            category_id: values.categoryId,
            account_id: values.accountId,
            notes: values.notes,
            main_amount: values.mainAmount,
            decimal_amount: values.decimalAmount,
            transacted_at: DateTime.fromJSDate(values.date).toSQL()!,
          })
          .throwOnError();
      } else {
        await supabase
          .from("incomes")
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
  });

  return (
    <RecordForm
      onSubmit={(values) => submit(values)}
      isSubmitting={isSubmitting}
    />
  );
}
