export const buildSessionQuery = (query) => {
  let prompt = process.env.CHARACTOR;
  if (prompt) {
    prompt += '\n\n';
  }
  prompt += `Q: ${query} +"\nA: "`;
  return prompt;
};
