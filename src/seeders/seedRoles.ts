import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";

export const createDefaultRoles = async () => {
  const roleRepo = AppDataSource.getRepository(Role);

  const defaultRoles = [
    { name: "Admin" },
    { name: "Teacher" },
    { name: "Student" },
  ];

  try {
    for (const roleData of defaultRoles) {
      const exists = await roleRepo.findOneBy({ name: roleData.name });
      
      if (!exists) {
        const newRole = roleRepo.create(roleData);
        await roleRepo.save(newRole);
       // console.log(`Role '${roleData.name}' created`);
      } else {
        //console.log(`Role '${roleData.name}' already exists`);
      }
    }
  } catch (error) {
    console.error("Error creating roles:", error);
  }
};

