import * as yup from "yup";

export const articleSchema = yup.object({
  title: yup.string().required(),
  content: yup.string().required(),
  visible: yup.boolean(),
});
