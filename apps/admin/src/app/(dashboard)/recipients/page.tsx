import Link from "next/link";
import { getRecipients } from "@/actions/recipients";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageTransition,
} from "@upds/ui";
import { UserCheck, Plus } from "lucide-react";
import { RecipientsTable } from "./_components/recipients-table";

export default async function RecipientsPage() {
  const result = await getRecipients();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { recipients } = result.data;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Destinatarios</h1>
            <Badge variant="secondary" className="ml-1">
              {recipients.length} registros
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestiona los destinatarios de materiales e insumos
          </p>
        </div>
        <Link href="/recipients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Destinatario
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Listado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <UserCheck className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No hay destinatarios registrados
              </p>
              <p className="text-sm text-muted-foreground/70 mb-6">
                Comienza agregando tu primer destinatario al sistema
              </p>
              <Link href="/recipients/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Destinatario
                </Button>
              </Link>
            </div>
          ) : (
            <RecipientsTable recipients={recipients} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
