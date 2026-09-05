const fs = require('fs');
let content = fs.readFileSync('src/components/crm/CrmCallsList.tsx', 'utf8');

const correctDateStr = `  return \${d.getDate().toString().padStart(2, '0')}.\${(d.getMonth() + 1).toString().padStart(2, '0')}.\${d.getFullYear()} \${d.getHours().toString().padStart(2, '0')}:\${d.getMinutes().toString().padStart(2, '0')}`;

content = content.replace('return \\.\\.\\ \\:\\;', correctDateStr);


const func = `
  const handleMarkAsHandled = async (e: any, callId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`oapi/support/calls/\${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handled' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success( Qo'ng'iroq 'Javob berilgan' deb belgilandi" );
        router.refresh();
      } else {
        toast.error("Xatolik yuz berdi");
      }
    } catch (error) {
      toast.error("Tarmoq xatosi");
    }
  };`;

if (!content.includes('handleMarkAsHandled')) {
  content = content.replace('const applyCustomRange = () => {', func + '\n\n  const applyCustomRange = () => {');
}

fs.writeFileSync('src/components/crm/CrmCallsList.tsx', content, 'utf8');
