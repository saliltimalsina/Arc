import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(input: string, suffix: string) {
  const base = input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  return `${base || "workspace"}-${suffix.slice(0, 6)}`;
}

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users`);

  for (const u of users) {
    // Skip if user already has a defaultWorkspaceId
    if (u.defaultWorkspaceId) continue;

    // Check if user already owns a workspace
    let ws = await prisma.workspace.findFirst({ where: { ownerId: u.id } });
    if (!ws) {
      ws = await prisma.workspace.create({
        data: {
          name: `${u.name}'s workspace`,
          slug: slugify(u.name || u.email.split("@")[0] || "ws", u.id),
          ownerId: u.id,
        },
      });
      console.log(`  Created workspace ${ws.slug} for ${u.email}`);
    }

    // Ensure WorkspaceMember row for owner
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: ws.id, userId: u.id } },
      create: { workspaceId: ws.id, userId: u.id, role: "owner" },
      update: {},
    });

    // Set defaultWorkspaceId
    await prisma.user.update({ where: { id: u.id }, data: { defaultWorkspaceId: ws.id } });
  }

  // Backfill Project.workspaceId based on owner's default workspace
  const projects = await prisma.project.findMany({ where: { workspaceId: null } });
  console.log(`Backfilling ${projects.length} projects`);
  for (const p of projects) {
    const owner = await prisma.user.findUnique({ where: { id: p.ownerId } });
    if (!owner?.defaultWorkspaceId) continue;
    await prisma.project.update({ where: { id: p.id }, data: { workspaceId: owner.defaultWorkspaceId } });
  }

  // Backfill Team.workspaceId — use the owner-membership of any user in the team or first project's workspace
  const teams = await prisma.team.findMany({
    where: { workspaceId: null },
    include: { members: { take: 1, orderBy: { joinedAt: "asc" } }, projects: { take: 1 } },
  });
  console.log(`Backfilling ${teams.length} teams`);
  for (const t of teams) {
    let wsId: string | null = null;
    if (t.projects[0]?.workspaceId) wsId = t.projects[0].workspaceId;
    if (!wsId && t.members[0]) {
      const u = await prisma.user.findUnique({ where: { id: t.members[0].userId } });
      wsId = u?.defaultWorkspaceId ?? null;
    }
    if (wsId) {
      await prisma.team.update({ where: { id: t.id }, data: { workspaceId: wsId } });
    }
  }

  // Add ALL workspace owners as members of every project/team in that workspace
  // (so they can see what's in their workspace)
  const allWs = await prisma.workspace.findMany({ include: { members: true } });
  for (const ws of allWs) {
    const memberUserIds = new Set(ws.members.map(m => m.userId));
    const wsProjects = await prisma.project.findMany({ where: { workspaceId: ws.id } });
    for (const p of wsProjects) {
      // Ensure project owner is a workspace member
      if (!memberUserIds.has(p.ownerId)) {
        await prisma.workspaceMember.upsert({
          where: { workspaceId_userId: { workspaceId: ws.id, userId: p.ownerId } },
          create: { workspaceId: ws.id, userId: p.ownerId, role: "member" },
          update: {},
        });
      }
    }
  }

  // Backfill Item.completedAt for items already in Done status
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "Item" SET "completedAt" = "updatedAt" WHERE "status" = 'Done' AND "completedAt" IS NULL`
  );
  console.log(`Backfilled completedAt on ${result} items`);

  // Backfill Item.number for items where number=0 (sequential per project, ordered by createdAt)
  const projectsWithZero = await prisma.item.groupBy({
    by: ["projectId"],
    where: { number: 0 },
    _count: true,
  });
  for (const row of projectsWithZero) {
    const items = await prisma.item.findMany({
      where: { projectId: row.projectId, number: 0 },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const counter = await prisma.project.findUnique({ where: { id: row.projectId }, select: { itemCounter: true } });
    let n = (counter?.itemCounter ?? 0);
    for (const it of items) {
      n += 1;
      await prisma.item.update({ where: { id: it.id }, data: { number: n } });
    }
    await prisma.project.update({ where: { id: row.projectId }, data: { itemCounter: n } });
    console.log(`  Renumbered ${items.length} items in project ${row.projectId}, new counter ${n}`);
  }

  console.log("Backfill complete");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
