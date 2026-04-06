export const compareSkillCategories = (left: string, right: string) => {
  const priority = ["workspace", "workflow"];
  const leftIndex = priority.indexOf(left);
  const rightIndex = priority.indexOf(right);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  }

  return left.localeCompare(right);
};
