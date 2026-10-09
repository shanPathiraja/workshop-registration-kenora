import bcrypt from 'bcryptjs';
import dataSource from '../app-config/data-source.js';
import { User, type Role } from '../users/user.entity.js';
import { Workshop, WorkshopStatus } from '../workshops/workshop.entity.js';

// Dev-only accounts. The admin can be overridden with SEED_ADMIN_* in .env.
const SEED_USERS: {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive?: boolean;
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
  {
    name: 'Omar Programme',
    email: 'omar.manager@kenora.dev',
    password: 'Manager@123',
    role: 'manager',
  },
  // Several front-desk staff, to try registering for the same workshop at once.
  {
    name: 'Priya Front Desk',
    email: 'priya.staff@kenora.dev',
    password: 'Staff@123',
    role: 'staff',
  },
  {
    name: 'Leo Front Desk',
    email: 'leo.staff@kenora.dev',
    password: 'Staff@123',
    role: 'staff',
  },
  {
    name: 'Nina Front Desk',
    email: 'nina.staff@kenora.dev',
    password: 'Staff@123',
    role: 'staff',
  },
  // Deactivated account: sign-in must be refused.
  {
    name: 'Former Staff',
    email: 'former.staff@kenora.dev',
    password: 'Staff@123',
    role: 'staff',
    isActive: false,
  },
];

/** A time `days` from today at `hour`:00 local time. */
function at(days: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Sample workshops across the three locations, dated relative to today.
const SEED_WORKSHOPS = [
  {
    code: 'POT-101',
    title: 'Intro to Pottery',
    instructor: 'Ana Clay',
    location: 'Main Hall',
    start: at(1, 10),
    hours: 2,
    capacity: 20,
  },
  {
    code: 'CODE-201',
    title: 'Python for Beginners',
    instructor: 'Raj Patel',
    location: 'Riverside Centre',
    start: at(2, 18),
    hours: 3,
    capacity: 15,
  },
  {
    code: 'FIT-110',
    title: 'Morning Yoga',
    instructor: 'Lena Moss',
    location: 'Hillside Studio',
    start: at(3, 7),
    hours: 1,
    capacity: 12,
  },
  {
    code: 'POT-220',
    title: 'Wheel Throwing',
    instructor: 'Ana Clay',
    location: 'Main Hall',
    start: at(5, 14),
    hours: 3,
    capacity: 8,
  },
  {
    code: 'CODE-310',
    title: 'Build a Website',
    instructor: 'Raj Patel',
    location: 'Riverside Centre',
    start: at(9, 10),
    hours: 4,
    capacity: 20,
  },
  {
    code: 'FIT-205',
    title: 'HIIT Bootcamp',
    instructor: 'Marcus Lee',
    location: 'Hillside Studio',
    start: at(12, 9),
    hours: 1,
    capacity: 2,
  },
  {
    code: 'ART-150',
    title: 'Watercolour Basics',
    instructor: 'June Park',
    location: 'Main Hall',
    start: at(-3, 13),
    hours: 2,
    capacity: 10,
    status: WorkshopStatus.COMPLETED,
  },
  {
    code: 'FIT-099',
    title: 'Spin Class',
    instructor: 'Marcus Lee',
    location: 'Hillside Studio',
    start: at(4, 18),
    hours: 1,
    capacity: 16,
    status: WorkshopStatus.CANCELLED,
  },
];

async function seed() {
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);

    for (const { password, isActive = true, ...seedUser } of SEED_USERS) {
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
          isActive,
        }),
      );
      console.log(`Seeded ${seedUser.role}: ${email}`);
    }

    const workshops = dataSource.getRepository(Workshop);
    const manager = await users.findOneBy({ email: 'manager@kenora.dev' });
    for (const { start, hours, status, ...w } of SEED_WORKSHOPS) {
      if (await workshops.findOneBy({ code: w.code })) {
        console.log(`Workshop already exists: ${w.code}`);
        continue;
      }
      await workshops.save(
        workshops.create({
          ...w,
          description: null,
          startsAt: start,
          endsAt: new Date(start.getTime() + hours * 3_600_000),
          activeCount: 0,
          status: status ?? WorkshopStatus.SCHEDULED,
          createdBy: manager,
          updatedBy: manager,
        }),
      );
      console.log(`Seeded workshop: ${w.code}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

await seed();
