import { z } from "zod";
export const formFields = z
  .record(z.string(), z.union([z.string(), z.array(z.string())]))
  .transform((fields) => {
    const form = new FormData();
    for (const [key, values] of Object.entries(fields))
      for (const value of Array.isArray(values) ? values : [values]) form.append(key, value);
    return form;
  });
