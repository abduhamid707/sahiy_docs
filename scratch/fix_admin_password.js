db.users.updateMany(
  { role: "SUPER_ADMIN" },
  { $set: { password: "$2b$10$FtMP4e4EsidDVdHDG78aZOrcg7Dc0GcajtL99DXHk9Ph79S4mC8BW" } }
);
printjson(db.users.find({ role: "SUPER_ADMIN" }, { email: 1, name: 1, role: 1 }).toArray());
