import bcrypt from 'bcryptjs';
import dataSource from '../app-config/data-source.js';
import { User, type Role } from '../users/user.entity.js';

// Dev-only accounts. The admin can be overridden with SEED_ADMIN_* in .env.
const SEED_USERS: {
  name: string;
  email: string;
  password: string;
  role: Role;
}[] = [
  {
    name: process.env.SEED_ADMIN_NAME ?? 'Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@kenora.dev',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
    role: 'admin',
  },
  {
    name: 'Maya Manager',
    email: 'manager@kenora.dev',
    password: 'Manager@123',
    role: 'manager',
  },
  {
    name: 'Sam Staff',
    email: 'staff@kenora.dev',
    password: 'Staff@123',
    role: 'staff',
  },
];

async function seed() {
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);

    for (const { password, ...seedUser } of SEED_USERS) {
      const email = seedUser.email.toLowerCase();
      if (await users.findOneBy({ email })) {
        console.log(`User already exists: ${email}`);
        continue;
      }
      await users.save(
        users.create({
          ...seedUser,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          isActive: true,
        }),
      );
      console.log(`Seeded ${seedUser.role}: ${email}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

await seed();
