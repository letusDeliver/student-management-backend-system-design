const students = [
  {
    id: 1,
    name: "Kunal",
    email: "kunal@example.com",
    departmentId: 1,
  },
];

let nextId = 2;

export const findAll = () => {
  return students.map((student) => ({ ...student }));
};

export const findById = (id) => {
  const student = students.find((student) => student.id === id);

  return student ? { ...student } : undefined;
};

export const create = ({ name, email, departmentId }) => {
  const student = {
    id: nextId++,
    name,
    email,
    departmentId,
  };

  students.push(student);
  return { ...student };
};
