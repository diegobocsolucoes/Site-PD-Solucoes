const entradas = [
  {
    titulo: "Particular",
    descricao: "Serviços para desktop e notebook, com preços claros e solicitação pelo portal.",
    href: "#particular",
  },
  {
    titulo: "Empresas",
    descricao: "Chamados avulsos, pacotes anuais e suporte para pequenos negócios.",
    href: "#empresas",
  },
  {
    titulo: "Consultoria de TI",
    descricao: "Análise técnica e plano de melhorias para pequenos negócios.",
    href: "#consultorias",
  },
  {
    titulo: "Segurança Eletrônica",
    descricao: "Consultoria para câmeras, DVR/NVR, alarmes e estrutura existente.",
    href: "#consultorias",
  },
  {
    titulo: "Parcerias",
    descricao: "Cadastro comercial para lojas, assistências e negócios locais.",
    href: "#parcerias",
  },
  {
    titulo: "Loja rápida",
    descricao: "Acessórios e itens de informática para reserva conforme estoque.",
    href: "#loja",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero__content shell">
          <span className="eyebrow">PD SOLUÇÕES DIGITAIS</span>
          <h1>Portal do Cliente</h1>
          <p>
            Solicite serviços, orçamentos e consultorias de forma simples. Sem login e sem CPF.
            Atendimento técnico em Contagem, mediante confirmação pelo WhatsApp.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#acessos">Escolher atendimento</a>
            <a className="button button--ghost" href="#orcamento">Solicitar orçamento</a>
          </div>
          <div className="hero__notice">
            O envio da solicitação não confirma automaticamente o atendimento. A PD entrará em contato para confirmar disponibilidade e horário.
          </div>
        </div>
      </section>

      <section className="shell section" id="acessos">
        <div className="section__heading">
          <span className="eyebrow">ACESSO RÁPIDO</span>
          <h2>Como podemos ajudar?</h2>
        </div>
        <div className="grid">
          {entradas.map((item) => (
            <a className="card" href={item.href} key={item.titulo}>
              <span className="card__line" />
              <h3>{item.titulo}</h3>
              <p>{item.descricao}</p>
              <span className="card__link">Acessar →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="shell section section--compact" id="particular">
        <div className="feature">
          <div>
            <span className="eyebrow">ATENDIMENTO PARTICULAR</span>
            <h2>Desktop e notebook</h2>
            <p>Formatação, limpeza, check-up, problemas de Windows, vírus, upgrades e outros serviços do catálogo oficial.</p>
          </div>
          <div className="price-box">
            <span>Serviços selecionados</span>
            <strong>a partir de R$ 50</strong>
            <small>Peças e deslocamento, quando aplicáveis, são calculados separadamente.</small>
          </div>
        </div>
      </section>

      <section className="shell section section--compact" id="empresas">
        <div className="feature">
          <div>
            <span className="eyebrow">PEQUENOS NEGÓCIOS</span>
            <h2>Suporte empresarial por chamados</h2>
            <p>Chamados remotos ou presenciais, histórico técnico e pacotes com validade de 12 meses.</p>
          </div>
          <div className="price-box">
            <span>Chamado empresarial</span>
            <strong>R$ 70</strong>
            <small>Atendimento presencial sujeito ao deslocamento de R$ 2,50/km, somente ida.</small>
          </div>
        </div>
      </section>

      <section className="shell section" id="consultorias">
        <div className="section__heading">
          <span className="eyebrow">CONSULTORIAS</span>
          <h2>Análise antes de investir</h2>
        </div>
        <div className="grid grid--two">
          <article className="card card--static">
            <h3>Consultoria de TI Empresarial</h3>
            <p>Para pequenos negócios, com análise da estrutura e plano de melhorias.</p>
            <strong className="price">R$ 400</strong>
          </article>
          <article className="card card--static">
            <h3>Consultoria em Segurança Eletrônica</h3>
            <p>Análise consultiva de CFTV, alarmes, posicionamento e infraestrutura existente.</p>
            <strong className="price">R$ 300</strong>
          </article>
        </div>
      </section>

      <section className="shell section section--compact" id="orcamento">
        <div className="cta">
          <span className="eyebrow">PRÓXIMA ETAPA</span>
          <h2>Formulários e triagem entram na próxima versão.</h2>
          <p>Esta primeira entrega cria a base visual e estrutural do novo Portal do Cliente sem alterar o site atual em produção.</p>
        </div>
      </section>
    </main>
  );
}
