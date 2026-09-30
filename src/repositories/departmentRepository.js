const departments = [
  {
    id: 1,
    name: "Computer Science & Engg.",
    code: "CSE",
  },
];

let nextId = 2;

export const findAll = () => {
  return departments.map((department) => ({ ...department }));
};

export const findById = (id) => {
  const department = departments.find((dept) => dept.id === id);

  return department ? { ...department } : undefined;
};

export const findByCode = (code) => {
  const department = departments.find((dept) => dept.code === code);

  return department ? { ...department } : undefined;
};

export const create = ({ name, code }) => {
  const department = {
    id: nextId++,
    name,
    code,
  };

  departments.push(department);

  return { ...department };
};
