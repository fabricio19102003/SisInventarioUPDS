import Link from "next/link";
import { getRecipients } from "@/actions/recipients";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@upds/ui";
import { RECIPIENT_TYPE_LABELS } from "@upds/validators";
import { UserCheck, Plus, Eye } from "lucide-react";

export default async function RecipientsPage() {
  const result = await getRecipients();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { recipients } = result.data;

  return (
    <TooltipProvider>
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
          <CardContent className="p-0">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doc. Nro</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Carrera</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.document_number}</TableCell>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {RECIPIENT_TYPE_LABELS[r.type as keyof typeof RECIPIENT_TYPE_LABELS] ?? r.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.phone || "\u2014"}</TableCell>
                      <TableCell>{r.career || "\u2014"}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "default" : "secondary"}>
                          {r.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/recipients/${r.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
