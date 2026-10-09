import bcrypt from 'bcryptjs';
import dataSource from '../app-config/data-source.js';
import { User } from '../users/user.entity.js';
const ADMIN = {
  name: process.env.SEED_ADMIN_NAME ?? 'Admin',
  email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@kenora.dev').toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
};

async function seed() {
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);

    const existing = await users.findOneBy({ email: ADMIN.email });
    if (existing) {
      console.log(`Admin already exists: ${ADMIN.email}`);
      return;
    }

    await users.save(
      users.create({
        name: ADMIN.name,
        email: ADMIN.email,
        passwordHash: await bcrypt.hash(ADMIN.password, 12),
        role: 'admin',
        isActive: true,
      }),
    );
    console.log(`Seeded admin: ${ADMIN.email}`);
  } finally {
    await dataSource.destroy();
  }
}

await seed();
