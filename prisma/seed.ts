import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users
  const userEmails = [
    { email: "henrik.stahl@hammarbyfotboll.se", name: "Henrik Stahl" },
    { email: "david.jesperson.mora@hammarbyfotboll.se", name: "David Jesperson Mora" },
    { email: "lukas.lundberg@hammarbyfotboll.se", name: "Lukas Lundberg" },
  ];
  for (const { email, name } of userEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name, role: "Admin", notifyNewSubmissions: true },
    });
  }


  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.upsert({
      where: { contactId: "CID00001" },
      update: { team: "[]" },
      create: {
        contactId: "CID00001",
        firstName: "Nick",
        lastName: "Fury",
        email: "nick.fury@shield.com",
        company: "S.H.I.E.L.D.",
        role: "Editor",
        workPhone: "0701234567",
        cellPhone: "0701234567",
        comments: JSON.stringify([]),
      },
    }),
    prisma.contact.upsert({
      where: { contactId: "CID00002" },
      update: { team: "[]" },
      create: {
        contactId: "CID00002",
        firstName: "Diana",
        lastName: "Prince",
        email: "diana@wonderwoman.com",
        company: "Justice League",
        role: "Reporter",
        workPhone: "0701234567",
        cellPhone: "0701234567",
        comments: JSON.stringify([]),
      },
    }),
    prisma.contact.upsert({
      where: { contactId: "CID00003" },
      update: { team: "[]" },
      create: {
        contactId: "CID00003",
        firstName: "Bruce",
        lastName: "Wayne",
        email: "bruce@wayneenterprises.com",
        company: "Justice League",
        role: "Editor in chief",
        workPhone: "0701234567",
        cellPhone: "0701234567",
        comments: JSON.stringify([]),
      },
    }),
    prisma.contact.upsert({
      where: { contactId: "CID00004" },
      update: { team: "[]" },
      create: {
        contactId: "CID00004",
        firstName: "Natalia",
        lastName: "Romanoff",
        email: "natalia.romanoff@blackwidow.com",
        company: "S.H.I.E.L.D.",
        role: "Editor",
        workPhone: "0701234567",
        cellPhone: "0701234567",
        comments: JSON.stringify([]),
      },
    }),
    prisma.contact.upsert({
      where: { contactId: "CID00005" },
      update: { team: "[]" },
      create: {
        contactId: "CID00005",
        firstName: "Peter",
        lastName: "Parker",
        email: "peter.parker@thedailybugle.com",
        company: "S.H.I.E.L.D.",
        role: "Photographer",
        workPhone: "0701234567",
        cellPhone: "0701234567",
        comments: JSON.stringify([]),
      },
    }),
    prisma.contact.upsert({
      where: { contactId: "CID00006" },
      update: { team: "[]" },
      create: {
        contactId: "CID00006",
        firstName: "Tony",
        lastName: "Stark",
        email: "tony.stark@starkindustries.com",
        company: "S.H.I.E.L.D.",
        role: "Reporter",
        workPhone: "0701234567",
        cellPhone: "0701234567",
        comments: JSON.stringify([
          {
            author: "David Jesperson Mora",
            timestamp: "2026-03-13T10:00:00Z",
            text: "Dök inte upp på senaste matchen!",
          },
          {
            author: "Lukas Lundberg",
            timestamp: "2026-04-04T21:00:00Z",
            text: "Nästa gång blir han bannad!",
          },
        ]),
      },
    }),
  ]);

  // Create events
  const events = await Promise.all([
    prisma.event.upsert({
      where: { eventId: "EID00001" },
      update: {},
      create: {
        eventId: "EID00001",
        eventName: "Hammarby IF – Mjällby AIF",
        eventDate: new Date("2026-04-04T15:00:00"),
        competition: "Allsvenskan 2026",
        arena: "3Arena",
        pressSeatsCapacity: 10,
        photoPitCapacity: 10,
        cmsEventId: "cms-001",
      },
    }),
    prisma.event.upsert({
      where: { eventId: "EID00002" },
      update: {},
      create: {
        eventId: "EID00002",
        eventName: "Hammarby IF – AC Sparta Prag",
        eventDate: new Date("2026-04-02T19:00:00"),
        competition: "UEFA Women's Europa Cup",
        arena: "3Arena",
        pressSeatsCapacity: 10,
        photoPitCapacity: 10,
        cmsEventId: "cms-002",
      },
    }),
    prisma.event.upsert({
      where: { eventId: "EID00003" },
      update: {},
      create: {
        eventId: "EID00003",
        eventName: "Hammarby IF – IK Sirius",
        eventDate: new Date("2026-03-22T13:30:00"),
        competition: "Svenska Cupen",
        arena: "3Arena",
        pressSeatsCapacity: 10,
        photoPitCapacity: 10,
        cmsEventId: "cms-003",
      },
    }),
    prisma.event.upsert({
      where: { eventId: "EID00004" },
      update: {},
      create: {
        eventId: "EID00004",
        eventName: "Hammarby IF – IK Uppsala",
        eventDate: new Date("2026-05-02T15:00:00"),
        competition: "OBOS Damallsvenskan 2026",
        arena: "Hammarby IP",
        pressSeatsCapacity: 10,
        photoPitCapacity: 10,
        cmsEventId: "cms-004",
      },
    }),
    prisma.event.upsert({
      where: { eventId: "EID00005" },
      update: {},
      create: {
        eventId: "EID00005",
        eventName: "Hammarby IF – Västerås SK",
        eventDate: new Date("2026-05-03T14:00:00"),
        competition: "Allsvenskan 2026",
        arena: "3Arena",
        pressSeatsCapacity: 10,
        photoPitCapacity: 10,
        cmsEventId: "cms-005",
      },
    }),
  ]);

  // Create submissions
  await Promise.all([
    prisma.submission.upsert({
      where: { submissionId: "SID00001" },
      update: { assignedSeat: "Press seat", accreditationType: "Media", attended: false },
      create: {
        submissionId: "SID00001",
        eventId: events[0].id,
        applicantId: contacts[0].id, // Nick Fury
        accreditedId: contacts[5].id, // Tony Stark
        company: "S.H.I.E.L.D.",
        phone: "0701234567",
        category: "Press",
        assignedSeat: "Press seat",
        accreditationType: "Media",
        pressCard: "AIPS-kort",
        status: "Pending",
      },
    }),
    prisma.submission.upsert({
      where: { submissionId: "SID00002" },
      update: { assignedSeat: "Photo pit", accreditationType: "Foto", attended: false },
      create: {
        submissionId: "SID00002",
        eventId: events[0].id,
        applicantId: contacts[0].id, // Nick Fury
        accreditedId: contacts[4].id, // Peter Parker
        company: "S.H.I.E.L.D.",
        phone: "0701234567",
        category: "Foto",
        assignedSeat: "Photo pit",
        accreditationType: "Foto",
        pressCard: "Kort saknas",
        status: "Pending",
      },
    }),
    prisma.submission.upsert({
      where: { submissionId: "SID00003" },
      update: { assignedSeat: "Press seat", accreditationType: "Media", attended: false },
      create: {
        submissionId: "SID00003",
        eventId: events[0].id,
        applicantId: contacts[0].id, // Nick Fury
        accreditedId: contacts[3].id, // Natalia
        company: "S.H.I.E.L.D.",
        phone: "0701234567",
        category: "Radio",
        assignedSeat: "Press seat",
        accreditationType: "Media",
        pressCard: "Annat presskort",
        otherNotes: "Allergisk mot nötter",
        status: "Approved",
      },
    }),
    prisma.submission.upsert({
      where: { submissionId: "SID00004" },
      update: { assignedSeat: "Photo pit", accreditationType: "TV", attended: false },
      create: {
        submissionId: "SID00004",
        eventId: events[0].id,
        applicantId: contacts[2].id, // Alfred (using Bruce Wayne as applicant)
        accreditedId: contacts[2].id, // Bruce Wayne
        company: "Justice League",
        phone: "0701234567",
        category: "TV",
        assignedSeat: "Photo pit",
        accreditationType: "TV",
        pressCard: "Kort saknas",
        otherNotes: "Hejjar på AIK",
        status: "Rejected",
      },
    }),
    prisma.submission.upsert({
      where: { submissionId: "SID00005" },
      update: { assignedSeat: "Press seat", accreditationType: "Media", attended: false },
      create: {
        submissionId: "SID00005",
        eventId: events[1].id,
        applicantId: contacts[1].id, // Diana Prince (self-applicant)
        accreditedId: contacts[1].id,
        company: "Justice League",
        phone: "0701234567",
        category: "Webb",
        assignedSeat: "Press seat",
        accreditationType: "Media",
        pressCard: "AIPS-kort",
        status: "Approved",
      },
    }),
    prisma.submission.upsert({
      where: { submissionId: "SID00006" },
      update: { assignedSeat: "Photo pit", accreditationType: "TV", attended: false },
      create: {
        submissionId: "SID00006",
        eventId: events[0].id,
        applicantId: contacts[3].id, // Diana Prince (applicant)
        accreditedId: contacts[3].id, // Diana Prince (accredited, self-applying)
        company: "Justice League",
        phone: "0709876543",
        category: "TV",
        assignedSeat: "Photo pit",
        accreditationType: "TV",
        pressCard: "AIPS-kort",
        status: "Pending",
      },
    }),
    prisma.submission.upsert({
      where: { submissionId: "SID00007" },
      update: { assignedSeat: "Press seat", accreditationType: "Media", attended: false },
      create: {
        submissionId: "SID00007",
        eventId: events[1].id,
        applicantId: contacts[0].id, // Nick Fury (applicant)
        accreditedId: contacts[1].id, // Bruce Wayne (accredited)
        company: "Justice League",
        phone: "0701112233",
        category: "Radio",
        assignedSeat: "Press seat",
        accreditationType: "Media",
        pressCard: "Annat presskort",
        otherNotes: "Tar med egen utrustning",
        status: "Pending",
      },
    }),
  ]);

  console.log("Seeding complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
