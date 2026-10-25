/**
 * Distritos e regiões autónomas de Portugal, com os seus concelhos (308).
 * Fonte: lista oficial de concelhos (códigos de distrito/concelho), via centraldedados/codigos_postais.
 * Os Açores e a Madeira são regiões autónomas, não distritos; aqui aparecem ao lado dos distritos para filtrar.
 */
export const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria',
  'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Açores', 'Madeira',
] as const;
export type District = (typeof DISTRICTS)[number];

/** Concelhos de cada distrito ou região autónoma. "Lagoa" e "Calheta" existem em duas regiões. */
export const MUNICIPALITIES: Record<District, readonly string[]> = {
  'Aveiro': ['Albergaria-a-Velha', 'Anadia', 'Arouca', 'Aveiro', 'Castelo de Paiva', 'Espinho', 'Estarreja', 'Mealhada', 'Murtosa', 'Oliveira de Azeméis', 'Oliveira do Bairro', 'Ovar', 'Santa Maria da Feira', 'Sever do Vouga', 'São João da Madeira', 'Vagos', 'Vale de Cambra', 'Águeda', 'Ílhavo'],
  'Beja': ['Aljustrel', 'Almodôvar', 'Alvito', 'Barrancos', 'Beja', 'Castro Verde', 'Cuba', 'Ferreira do Alentejo', 'Moura', 'Mértola', 'Odemira', 'Ourique', 'Serpa', 'Vidigueira'],
  'Braga': ['Amares', 'Barcelos', 'Braga', 'Cabeceiras de Basto', 'Celorico de Basto', 'Esposende', 'Fafe', 'Guimarães', 'Póvoa de Lanhoso', 'Terras de Bouro', 'Vieira do Minho', 'Vila Nova de Famalicão', 'Vila Verde', 'Vizela'],
  'Bragança': ['Alfândega da Fé', 'Bragança', 'Carrazeda de Ansiães', 'Freixo de Espada à Cinta', 'Macedo de Cavaleiros', 'Miranda do Douro', 'Mirandela', 'Mogadouro', 'Torre de Moncorvo', 'Vila Flor', 'Vimioso', 'Vinhais'],
  'Castelo Branco': ['Belmonte', 'Castelo Branco', 'Covilhã', 'Fundão', 'Idanha-a-Nova', 'Oleiros', 'Penamacor', 'Proença-a-Nova', 'Sertã', 'Vila de Rei', 'Vila Velha de Ródão'],
  'Coimbra': ['Arganil', 'Cantanhede', 'Coimbra', 'Condeixa-a-Nova', 'Figueira da Foz', 'Góis', 'Lousã', 'Mira', 'Miranda do Corvo', 'Montemor-o-Velho', 'Oliveira do Hospital', 'Pampilhosa da Serra', 'Penacova', 'Penela', 'Soure', 'Tábua', 'Vila Nova de Poiares'],
  'Évora': ['Alandroal', 'Arraiolos', 'Borba', 'Estremoz', 'Montemor-o-Novo', 'Mora', 'Mourão', 'Portel', 'Redondo', 'Reguengos de Monsaraz', 'Vendas Novas', 'Viana do Alentejo', 'Vila Viçosa', 'Évora'],
  'Faro': ['Albufeira', 'Alcoutim', 'Aljezur', 'Castro Marim', 'Faro', 'Lagoa', 'Lagos', 'Loulé', 'Monchique', 'Olhão', 'Portimão', 'Silves', 'São Brás de Alportel', 'Tavira', 'Vila do Bispo', 'Vila Real de Santo António'],
  'Guarda': ['Aguiar da Beira', 'Almeida', 'Celorico da Beira', 'Figueira de Castelo Rodrigo', 'Fornos de Algodres', 'Gouveia', 'Guarda', 'Manteigas', 'Meda', 'Pinhel', 'Sabugal', 'Seia', 'Trancoso', 'Vila Nova de Foz Côa'],
  'Leiria': ['Alcobaça', 'Alvaiázere', 'Ansião', 'Batalha', 'Bombarral', 'Caldas da Rainha', 'Castanheira de Pêra', 'Figueiró dos Vinhos', 'Leiria', 'Marinha Grande', 'Nazaré', 'Pedrógão Grande', 'Peniche', 'Pombal', 'Porto de Mós', 'Óbidos'],
  'Lisboa': ['Alenquer', 'Amadora', 'Arruda dos Vinhos', 'Azambuja', 'Cadaval', 'Cascais', 'Lisboa', 'Loures', 'Lourinhã', 'Mafra', 'Odivelas', 'Oeiras', 'Sintra', 'Sobral de Monte Agraço', 'Torres Vedras', 'Vila Franca de Xira'],
  'Portalegre': ['Alter do Chão', 'Arronches', 'Avis', 'Campo Maior', 'Castelo de Vide', 'Crato', 'Elvas', 'Fronteira', 'Gavião', 'Marvão', 'Monforte', 'Nisa', 'Ponte de Sor', 'Portalegre', 'Sousel'],
  'Porto': ['Amarante', 'Baião', 'Felgueiras', 'Gondomar', 'Lousada', 'Maia', 'Marco de Canaveses', 'Matosinhos', 'Paredes', 'Paços de Ferreira', 'Penafiel', 'Porto', 'Póvoa de Varzim', 'Santo Tirso', 'Trofa', 'Valongo', 'Vila do Conde', 'Vila Nova de Gaia'],
  'Santarém': ['Abrantes', 'Alcanena', 'Almeirim', 'Alpiarça', 'Benavente', 'Cartaxo', 'Chamusca', 'Constância', 'Coruche', 'Entroncamento', 'Ferreira do Zêzere', 'Golegã', 'Mação', 'Ourém', 'Rio Maior', 'Salvaterra de Magos', 'Santarém', 'Sardoal', 'Tomar', 'Torres Novas', 'Vila Nova da Barquinha'],
  'Setúbal': ['Alcochete', 'Alcácer do Sal', 'Almada', 'Barreiro', 'Grândola', 'Moita', 'Montijo', 'Palmela', 'Santiago do Cacém', 'Seixal', 'Sesimbra', 'Setúbal', 'Sines'],
  'Viana do Castelo': ['Arcos de Valdevez', 'Caminha', 'Melgaço', 'Monção', 'Paredes de Coura', 'Ponte da Barca', 'Ponte de Lima', 'Valença', 'Viana do Castelo', 'Vila Nova de Cerveira'],
  'Vila Real': ['Alijó', 'Boticas', 'Chaves', 'Mesão Frio', 'Mondim de Basto', 'Montalegre', 'Murça', 'Peso da Régua', 'Ribeira de Pena', 'Sabrosa', 'Santa Marta de Penaguião', 'Valpaços', 'Vila Pouca de Aguiar', 'Vila Real'],
  'Viseu': ['Armamar', 'Carregal do Sal', 'Castro Daire', 'Cinfães', 'Lamego', 'Mangualde', 'Moimenta da Beira', 'Mortágua', 'Nelas', 'Oliveira de Frades', 'Penalva do Castelo', 'Penedono', 'Resende', 'Santa Comba Dão', 'Sernancelhe', 'Sátão', 'São João da Pesqueira', 'São Pedro do Sul', 'Tabuaço', 'Tarouca', 'Tondela', 'Vila Nova de Paiva', 'Viseu', 'Vouzela'],
  'Açores': ['Angra do Heroísmo', 'Calheta', 'Corvo', 'Horta', 'Lagoa', 'Lajes das Flores', 'Lajes do Pico', 'Madalena', 'Nordeste', 'Ponta Delgada', 'Povoação', 'Praia da Vitória', 'Ribeira Grande', 'Santa Cruz da Graciosa', 'Santa Cruz das Flores', 'São Roque do Pico', 'Velas', 'Vila do Porto', 'Vila Franca do Campo'],
  'Madeira': ['Calheta', 'Câmara de Lobos', 'Funchal', 'Machico', 'Ponta do Sol', 'Porto Moniz', 'Porto Santo', 'Ribeira Brava', 'Santa Cruz', 'Santana', 'São Vicente'],
};

const key = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** concelho normalizado → distritos onde existe (1, ou 2 nos nomes repetidos) */
const INDEX = new Map<string, District[]>();
for (const district of DISTRICTS) {
  for (const m of MUNICIPALITIES[district]) {
    const k = key(m);
    INDEX.set(k, [...(INDEX.get(k) ?? []), district]);
  }
}

/** O distrito de um concelho; null se não for um concelho ou se o nome existir em mais de um distrito (Lagoa, Calheta) */
export function districtOf(municipality: string | null | undefined): District | null {
  if (!municipality) return null;
  const found = INDEX.get(key(municipality));
  return found?.length === 1 ? found[0] : null;
}

export const isDistrict = (v: unknown): v is District => typeof v === 'string' && (DISTRICTS as readonly string[]).includes(v);

export interface Municipality {
  name: string;
  district: District;
}

const ALL_MUNICIPALITIES: (Municipality & { k: string; words: string[] })[] = DISTRICTS.flatMap((district) =>
  MUNICIPALITIES[district].map((name) => {
    const k = key(name);
    return { name, district, k, words: k.split(/[\s-]+/) };
  }),
);

/**
 * Concelhos para sugerir enquanto se escreve a localidade (25/10, em vez de um mapa).
 * Primeiro os que começam pelo texto, depois os que têm uma palavra que começa por ele ("gai" → Vila Nova de Gaia).
 * Sem acentos nem maiúsculas; os nomes repetidos (Lagoa, Calheta) aparecem uma vez por distrito.
 */
export function suggestMunicipalities(q: string, max = 6): Municipality[] {
  const nq = key(q);
  if (nq.length < 2) return [];
  const starts = ALL_MUNICIPALITIES.filter((m) => m.k.startsWith(nq));
  const inside = ALL_MUNICIPALITIES.filter((m) => !m.k.startsWith(nq) && m.words.some((w) => w.startsWith(nq)));
  const byName = (a: Municipality, b: Municipality) => a.name.localeCompare(b.name, 'pt') || a.district.localeCompare(b.district, 'pt');
  return [...starts.sort(byName), ...inside.sort(byName)].slice(0, max).map(({ name, district }) => ({ name, district }));
}

/** O concelho escrito à mão, com a grafia oficial e o distrito (se não houver dúvidas); null se não for um concelho */
export function findMunicipality(text: string | null | undefined): Municipality | null {
  if (!text) return null;
  const k = key(text);
  const found = ALL_MUNICIPALITIES.filter((m) => m.k === k);
  return found.length === 1 ? { name: found[0].name, district: found[0].district } : null;
}
