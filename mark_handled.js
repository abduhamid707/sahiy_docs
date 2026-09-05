const fs = require('fs');
let content = fs.readFileSync('src/components/crm/CrmCallsList.tsx', 'utf8');

const importRegex = /import \{ CheckCircle2 \} from "lucide-react";/;
if (!importRegex.test(content)) {
  content = content.replace('Calendar } from "lucide-react";', 'Calendar, CheckCircle2 } from "lucide-react";');
}

const func = `
  const handleMarkAsHandled = async (e: React.MouseEvent, callId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(\`/api/support/calls/\${callId}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handled' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Qo'ng'iroq 'Javob berilgan' deb belgilandi");
        router.refresh();
      } else {
        toast.error("Xatolik yuz berdi");
      }
    } catch (e) {
      toast.error("Tarmoq xatosi");
    }
  };
`;

content = content.replace('const applyCustomRange = () => {', func + '\n  const applyCustomRange = () => {');

// Update statuses array rendering to handle 'handled'
content = content.replace(
  `{call.status === 'answered' ? 'Javob berilgan' : "O'tkazib yuborilgan"}`,
  `{call.status === 'answered' ? 'Javob berilgan' : call.status === 'handled' ? 'Qaytarilgan' : "O'tkazib yuborilgan"}`
);

content = content.replace(
  `call.status === 'answered' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"`,
  `call.status === 'answered' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : call.status === 'handled' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-red-100 text-red-700 border-red-200"`
);

// Add button in actions column
const actionCode = `                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {isMissed && !call.ticketId && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={(e) => handleMarkAsHandled(e, call._id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Javob berdim
                            </Button>
                          )}
                          {!call.ticketId ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => handleCreateTicket(e, call._id, call.phone)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Ticket
                            </Button>
                          ) : (`;

content = content.replace(`                      <td className="px-4 py-3 text-right">
                        {!call.ticketId ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => handleCreateTicket(e, call._id, call.phone)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Ticket yaratish
                          </Button>
                        ) : (`, actionCode);

// Add missing closing div for the actions column
content = content.replace(`                            </Button>
                          </Link>
                        )}
                      </td>`, `                            </Button>
                          </Link>
                        )}
                        </div>
                      </td>`);

fs.writeFileSync('src/components/crm/CrmCallsList.tsx', content, 'utf8');
