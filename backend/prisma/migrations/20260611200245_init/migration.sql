-- CreateTable
CREATE TABLE "listas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" SERIAL NOT NULL,
    "listaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "delayMin" INTEGER NOT NULL,
    "delayMax" INTEGER NOT NULL,
    "listaId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_envio" (
    "id" SERIAL NOT NULL,
    "contatoId" INTEGER NOT NULL,
    "campanhaId" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fila_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fluxos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxo_etapas" (
    "id" SERIAL NOT NULL,
    "fluxoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "delayMinutos" INTEGER NOT NULL,

    CONSTRAINT "fluxo_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucao_fluxo" (
    "id" SERIAL NOT NULL,
    "contatoId" INTEGER NOT NULL,
    "fluxoId" INTEGER NOT NULL,
    "etapaAtual" INTEGER NOT NULL DEFAULT 0,
    "nextExecutionAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execucao_fluxo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "listas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_envio" ADD CONSTRAINT "fila_envio_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "contatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_envio" ADD CONSTRAINT "fila_envio_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxo_etapas" ADD CONSTRAINT "fluxo_etapas_fluxoId_fkey" FOREIGN KEY ("fluxoId") REFERENCES "fluxos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucao_fluxo" ADD CONSTRAINT "execucao_fluxo_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "contatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucao_fluxo" ADD CONSTRAINT "execucao_fluxo_fluxoId_fkey" FOREIGN KEY ("fluxoId") REFERENCES "fluxos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
