"use client";

import { Database } from "@/lib/supabase.types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { useMutation } from "react-query";
import { z } from "zod";

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

export default function BulkUploadForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);
  const [openaiData, setOpenaiData] = useState<OpenAIData>();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
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
                'Give concise, straightforward answers without useless sentences. Use this JSON format: {"items":[{"name":"name","category":"category","qty":3,"price":1000,"subtotal":3000}],"subtotal":3000,"date":"2024-03-23 16:16:32.472+00"}. The categories are: Food, Subscription, Shopping, Transportation. Change the item names into the nearest correct names, without acronyms etc, in Bahasa Indonesia.',
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
          console.log(data);
          const rawContent = data?.choices?.[0]?.message.content ?? "";
          let b = "";
          if (rawContent.startsWith("```json")) {
            b = rawContent.replace("```json", "");
          }
          if (rawContent.endsWith("\n```")) {
            b = b.slice(0, b.length - 4);
          }
          setOpenaiData(JSON.parse(b));
          setShowData(true);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
        });
    }
  };

  const deleteImage = () => {
    setPreview(null);
  };

  const { mutate: uploadImage } = useMutation({
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
      console.log(fileData);

      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(fileData.path, 600);
      console.log(data, error);
      if (data?.signedUrl) {
        handleSubmit(data?.signedUrl);
      }
    },
  });

  return (
    <div className="flex flex-col justify-center items-center h-[90vh]">
      <form
        onSubmit={() => {}}
        className="flex flex-col space-y-2 px-2 justify-center items-center"
      >
        <input
          ref={inputRef}
          className="invisible w-0 h-0 absolute z-0"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {preview && <img src={preview} alt="Preview" />}
        {preview && (
          <>
            <button
              type="button"
              onClick={deleteImage}
              className="border-gray-700 border py-3 px-4 block rounded-md"
            >
              Delete Receipt
            </button>
            <button
              type="button"
              onClick={() => uploadImage()}
              disabled={isLoading}
              className="bg-[#0177FF] text-white py-3 px-4 block rounded-md flex items-center disabled:opacity-70"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Analyze Receipt
            </button>
          </>
        )}
        {!preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="bg-[#0177FF] text-white py-3 px-4 block rounded-md"
          >
            Upload Receipt
          </button>
        )}
      </form>
      {showData && (
        <div className="mb-24">
          {openaiData?.items.map((it) => (
            <div className="flex space-x-2 text-sm" key={it.name}>
              <p>{it.name} -</p>
              <p>{it.category} -</p>
              <p>Rp{it.subtotal}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
