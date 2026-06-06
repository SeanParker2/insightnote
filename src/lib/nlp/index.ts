import nlp from 'compromise';

export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'place' | 'money' | 'date' | 'percent';
  normal: string;
}

export interface NLPParseResult {
  entities: Entity[];
  topics: string[];
  verbs: string[];
  nouns: string[];
  sentences: string[];
  summary: {
    mainSubjects: string[];
    actions: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
  };
}

export interface FinancialEntityExtraction {
  companies: string[];
  people: string[];
  locations: string[];
  amounts: Array<{ value: string; context: string }>;
  dates: string[];
  percentages: Array<{ value: string; context: string }>;
  tickers: string[];
}

function extractFinancialEntities(text: string): FinancialEntityExtraction {
  const doc = nlp(text);

  const companies: string[] = [];
  const people: string[] = [];
  const locations: string[] = [];
  const amounts: Array<{ value: string; context: string }> = [];
  const dates: string[] = [];
  const percentages: Array<{ value: string; context: string }> = [];
  const tickers: string[] = [];

  // Extract organizations
  doc.organizations().forEach((org: any) => {
    const orgText = org.text();
    if (orgText && !companies.includes(orgText)) {
      companies.push(orgText);
    }
  });

  // Extract people
  doc.people().forEach((person: any) => {
    const personText = person.text();
    if (personText && !people.includes(personText)) {
      people.push(personText);
    }
  });

  // Extract places
  doc.places().forEach((place: any) => {
    const placeText = place.text();
    if (placeText && !locations.includes(placeText)) {
      locations.push(placeText);
    }
  });

  // Extract money amounts
  doc.money().forEach((money: any) => {
    const moneyText = money.text();
    if (moneyText) {
      // Get surrounding context
      const sentences = doc.sentences().json();
      let context = '';
      for (const sent of sentences) {
        if (sent.text && sent.text.includes(moneyText)) {
          context = sent.text.substring(0, 100);
          break;
        }
      }
      amounts.push({ value: moneyText, context });
    }
  });

  // Extract dates using regex patterns
  const datePatterns = [
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /\d{1,2}\/\d{1,2}\/\d{4}/g,
    /\d{4}-\d{2}-\d{2}/g,
    /Q[1-4]\s+\d{4}/gi,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/gi,
  ];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!dates.includes(match)) {
          dates.push(match);
        }
      });
    }
  });

  // Extract percentages
  const percentPattern = /\d+(\.\d+)?%/g;
  const percentMatches = text.match(percentPattern);
  if (percentMatches) {
    percentMatches.forEach(match => {
      const sentences = doc.sentences().json();
      let context = '';
      for (const sent of sentences) {
        if (sent.text && sent.text.includes(match)) {
          context = sent.text.substring(0, 100);
          break;
        }
      }
      percentages.push({ value: match, context });
    });
  }

  // Extract stock tickers (e.g., AAPL, TSLA, MSFT)
  const tickerPattern = /\b[A-Z]{1,5}\b/g;
  const commonWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HAS', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'SAY', 'SHE', 'TOO', 'USE']);
  
  const tickerMatches = text.match(tickerPattern);
  if (tickerMatches) {
    const uniqueTickers = [...new Set(tickerMatches)];
    uniqueTickers.forEach(ticker => {
      if (!commonWords.has(ticker) && ticker.length >= 2 && ticker.length <= 5) {
        // Check if it looks like a ticker (uppercase, in financial context)
        const contextCheck = text.toLowerCase();
        if (contextCheck.includes('stock') || contextCheck.includes('shares') || 
            contextCheck.includes('ticker') || contextCheck.includes('symbol') ||
            contextCheck.includes('$')) {
          tickers.push(ticker);
        }
      }
    });
  }

  return {
    companies,
    people,
    locations,
    amounts,
    dates,
    percentages,
    tickers,
  };
}

function analyzeSentimentFromText(text: string): 'positive' | 'negative' | 'neutral' {
  const doc = nlp(text);
  
  const positiveWords = ['increase', 'rise', 'gain', 'profit', 'growth', 'bullish', 'upgrade', 'outperform', 'beat', 'exceed', 'strong', 'positive', 'optimistic'];
  const negativeWords = ['decrease', 'fall', 'loss', 'decline', 'bearish', 'downgrade', 'underperform', 'miss', 'weak', 'negative', 'pessimistic', 'risk', 'concern'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  if (positiveCount > negativeCount * 1.2) return 'positive';
  if (negativeCount > positiveCount * 1.2) return 'negative';
  return 'neutral';
}

export function parseText(text: string): NLPParseResult {
  const doc = nlp(text);

  // Extract entities
  const entities: Entity[] = [];
  
  doc.organizations().forEach((org: any) => {
    entities.push({
      text: org.text(),
      type: 'organization',
      normal: org.text().toLowerCase(),
    });
  });

  doc.people().forEach((person: any) => {
    entities.push({
      text: person.text(),
      type: 'person',
      normal: person.text().toLowerCase(),
    });
  });

  doc.places().forEach((place: any) => {
    entities.push({
      text: place.text(),
      type: 'place',
      normal: place.text().toLowerCase(),
    });
  });

  doc.money().forEach((money: any) => {
    entities.push({
      text: money.text(),
      type: 'money',
      normal: money.text().toLowerCase(),
    });
  });

  // Extract dates using regex
  const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi;
  const dateMatches = text.match(dateRegex);
  if (dateMatches) {
    dateMatches.forEach(date => {
      entities.push({
        text: date,
        type: 'date',
        normal: date.toLowerCase(),
      });
    });
  }

  // Extract topics (nouns)
  const nouns = doc.nouns().out('array').slice(0, 20);
  
  // Extract verbs
  const verbs = doc.verbs().out('array').slice(0, 15);
  
  // Extract sentences
  const sentences = doc.sentences().out('array');
  
  // Get main subjects
  const mainSubjects = nouns.slice(0, 5);
  
  // Get actions
  const actions = verbs.slice(0, 5);
  
  // Analyze sentiment
  const sentiment = analyzeSentimentFromText(text);

  return {
    entities,
    topics: nouns,
    verbs,
    nouns,
    sentences,
    summary: {
      mainSubjects,
      actions,
      sentiment,
    },
  };
}

export function extractKeyInformation(text: string): {
  entities: FinancialEntityExtraction;
  parse: NLPParseResult;
  keyPhrases: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
} {
  const entities = extractFinancialEntities(text);
  const parse = parseText(text);
  
  // Extract key phrases (3-grams)
  const doc = nlp(text);
  const terms = doc.terms().out('array');
  const keyPhrases: string[] = [];
  
  for (let i = 0; i < terms.length - 2; i++) {
    const phrase = `${terms[i]} ${terms[i + 1]} ${terms[i + 2]}`;
    if (!keyPhrases.includes(phrase) && phrase.length > 10) {
      keyPhrases.push(phrase);
    }
    if (keyPhrases.length >= 10) break;
  }

  return {
    entities,
    parse,
    keyPhrases,
    sentiment: parse.summary.sentiment,
  };
}

export function summarizeEntities(entities: FinancialEntityExtraction): string {
  const parts: string[] = [];

  if (entities.companies.length > 0) {
    parts.push(`公司: ${entities.companies.slice(0, 5).join(', ')}`);
  }
  if (entities.people.length > 0) {
    parts.push(`人物: ${entities.people.slice(0, 3).join(', ')}`);
  }
  if (entities.tickers.length > 0) {
    parts.push(`股票代码: ${entities.tickers.slice(0, 5).join(', ')}`);
  }
  if (entities.amounts.length > 0) {
    parts.push(`金额: ${entities.amounts.slice(0, 3).map(a => a.value).join(', ')}`);
  }
  if (entities.percentages.length > 0) {
    parts.push(`百分比: ${entities.percentages.slice(0, 3).map(p => p.value).join(', ')}`);
  }

  return parts.join(' | ');
}
