export const idrFormat = (value: number | string) => {
  let nominal = 0;
  if (typeof value === "string") {
    nominal = parseFloat(value);
  } else {
    nominal = value;
  }

  const hasDecimals = nominal % 1 !== 0;
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: hasDecimals ? 10 : 0,
  });
  return formatter.format(nominal);
};
