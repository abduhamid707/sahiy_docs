"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-foreground">Tizim jurnali (Logs)</h1>
      <p className="text-muted-foreground">Foydalanuvchilar tomonidan amalga oshirilgan barcha harakatlar tarixi.</p>

      <Card className="rounded-[2.5rem] border-border shadow-xl bg-card">
        <CardContent className="p-6">
          {loading ? (
            <p className="text-center py-4">Yuklanmoqda...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Foydalanuvchi</TableHead>
                    <TableHead className="font-bold">Harakat</TableHead>
                    <TableHead className="font-bold">Turi</TableHead>
                    <TableHead className="font-bold">Tafsilotlar</TableHead>
                    <TableHead className="font-bold">Sana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">Hozircha jurnallar mavjud emas.</TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          <div>
                            <p className="font-bold">{log.userId?.name || "Noma'lum"}</p>
                            <p className="text-xs text-muted-foreground">{log.userId?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                            log.action === "CREATE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            log.action === "UPDATE" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            log.action === "DELETE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{log.entityType}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.details ? (
                            typeof log.details === "object" ? (
                              <span>{log.details.title || log.details.count || JSON.stringify(log.details)}</span>
                            ) : (
                              <span>{log.details}</span>
                            )
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("uz-UZ")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
