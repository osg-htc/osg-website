/**
 * Typed client for the OSG "adstash" Elasticsearch accounting endpoint.
 *
 * Replicates the functionality previously implemented in the Jekyll site's
 * `assets/js/{elasticsearch-v1,adstash}.js` modules, but as typed, reusable
 * functions for client components. These run in the browser at runtime to
 * surface live OSPool usage statistics.
 */

export const ADSTASH_ENDPOINT = 'https://elastic.osg.chtc.io/q';
export const ADSTASH_SUMMARY_INDEX = 'ospool-summary-*';

// The GRACC accounting endpoint powers the facility-level (institutions / CC*)
// tables, which aggregate over a different index than the adstash summaries.
export const GRACC_ENDPOINT = 'https://gracc.opensciencegrid.org/q';
export const GRACC_SUMMARY_INDEX = 'gracc.osg.summary';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ElasticTermsAgg {
  buckets: { key: string; doc_count: number }[];
}
interface ElasticValueAgg {
  value: number;
}

interface OverviewAggregations {
  NumInstitutions: ElasticTermsAgg;
  NumProjects: ElasticTermsAgg;
  NumMajorFieldOfScience: ElasticTermsAgg;
  NumBroadFieldOfScience: ElasticTermsAgg;
  NumDetailedFieldOfScience: ElasticTermsAgg;
  NumJobs: ElasticValueAgg;
  FileTransferCount: ElasticValueAgg;
  ByteTransferCount: ElasticValueAgg;
  CpuHours: ElasticValueAgg;
  GpuHours: ElasticValueAgg;
  OSDFFileTransferCount: ElasticValueAgg;
  OSDFByteTransferCount: ElasticValueAgg;
}

export interface OspoolOverview {
  numInstitutions: number;
  numJobs: number;
  cpuHours: number;
  gpuHours: number;
  fileTransferCount: number;
  byteTransferCount: number;
  osdfFileTransferCount: number;
  osdfByteTransferCount: number;
  numProjects: number;
  numMajorFieldOfScience: number;
  numBroadFieldOfScience: number;
  numDetailedFieldOfScience: number;
}

/** An overview tagged with the day it represents. */
export interface DatedOspoolOverview extends OspoolOverview {
  date: Date;
}

/**
 * Minimal Elasticsearch `_search` helper against a given index/endpoint.
 *
 * Retries transient failures (network errors, timeouts / ETIMEDOUT, and 5xx
 * responses) with exponential backoff + jitter. A static build issues hundreds
 * of these queries, so without retries a single slow or dropped connection
 * (common from CI runners) would abort the whole build. Deterministic 4xx
 * responses are not retried.
 */
async function elasticSearch<TResponse = unknown>(
  body: Record<string, unknown>,
  index: string = ADSTASH_SUMMARY_INDEX,
  endpoint: string = ADSTASH_ENDPOINT
): Promise<TResponse> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${endpoint}/${index}/_search`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (response.ok) {
        return await response.json();
      }
      // 4xx is deterministic — don't waste retries on it; 5xx is transient.
      if (response.status < 500) {
        throw Object.assign(
          new Error(`Invalid response from ${endpoint}: ${response.status}`),
          { fatal: true }
        );
      }
      throw new Error(`Server error ${response.status} from ${endpoint}`);
    } catch (error) {
      lastError = error;
      const fatal =
        error instanceof Error && (error as { fatal?: boolean }).fatal === true;
      if (fatal || attempt === MAX_ATTEMPTS) throw error;

      const delay = Math.round(
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250
      );
      console.warn(
        `[adstash] request failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms: ` +
          `${error instanceof Error ? error.message : String(error)}`
      );
      await sleep(delay);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

const termsAgg = (field: string) => ({ terms: { field, size: 10000 } });
const sumAgg = (field: string) => ({ sum: { field } });

/**
 * Aggregate OSPool usage statistics across a date range (epoch millis).
 */
export async function getInstitutionsOverview(
  startTime: number,
  endTime: number
): Promise<OspoolOverview> {
  const { aggregations } = await elasticSearch<{
    aggregations: OverviewAggregations;
  }>({
    size: 0,
    query: { range: { Date: { gte: startTime, lte: endTime } } },
    aggs: {
      NumInstitutions: termsAgg('ResourceInstitution.name.keyword'),
      NumProjects: termsAgg('ProjectName.keyword'),
      NumMajorFieldOfScience: termsAgg('MajorFieldOfScience.keyword'),
      NumBroadFieldOfScience: termsAgg('BroadFieldOfScience.keyword'),
      NumDetailedFieldOfScience: termsAgg('DetailedFieldOfScience.keyword'),
      NumJobs: sumAgg('NumJobs'),
      FileTransferCount: sumAgg('FileTransferCount'),
      ByteTransferCount: sumAgg('ByteTransferCount'),
      CpuHours: sumAgg('CpuHours'),
      GpuHours: sumAgg('GpuHours'),
      OSDFFileTransferCount: sumAgg('OSDFFileTransferCount'),
      OSDFByteTransferCount: sumAgg('OSDFByteTransferCount'),
    },
  });

  return {
    numInstitutions: aggregations.NumInstitutions.buckets.length,
    numJobs: aggregations.NumJobs.value,
    cpuHours: aggregations.CpuHours.value,
    gpuHours: aggregations.GpuHours.value,
    fileTransferCount: aggregations.FileTransferCount.value,
    byteTransferCount: aggregations.ByteTransferCount.value,
    osdfFileTransferCount: aggregations.OSDFFileTransferCount.value,
    osdfByteTransferCount: aggregations.OSDFByteTransferCount.value,
    numProjects: aggregations.NumProjects.buckets.length,
    numMajorFieldOfScience: aggregations.NumMajorFieldOfScience.buckets.length,
    numBroadFieldOfScience: aggregations.NumBroadFieldOfScience.buckets.length,
    numDetailedFieldOfScience:
      aggregations.NumDetailedFieldOfScience.buckets.length,
  };
}

/**
 * Walk backwards from today (UTC) to the most recent day with completed jobs
 * and return that day's overview. Capped to avoid an unbounded loop if the
 * endpoint is unavailable.
 */
export async function getLatestOSPoolOverview(): Promise<DatedOspoolOverview> {
  const MAX_LOOKBACK_DAYS = 30;
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    day.setUTCDate(day.getUTCDate() - 1);
    const overview = await getInstitutionsOverview(
      day.getTime(),
      day.getTime()
    );
    if (overview.numJobs > 0) {
      return { ...overview, date: new Date(day) };
    }
  }

  throw new Error('No recent OSPool overview data found');
}

/**
 * Convert a large number into a short (< 4 char) format, e.g. 100,000 → "100K"
 * or 1,000,000,000 → "1B".
 */
export function formatCompactNumber(value: number, decimals = 0): string {
  if (value < 1e3) return value.toFixed(decimals);
  if (value < 1e6) return (value / 1e3).toFixed(decimals) + 'K';
  if (value < 1e9) return (value / 1e6).toFixed(decimals) + 'M';
  if (value < 1e12) return (value / 1e9).toFixed(decimals) + 'B';
  return value.toFixed(decimals);
}

// ---------------------------------------------------------------------------
// Project & institution breakdowns (powers the OSPool projects/institutions
// pages). Each bucket aggregation is mapped into a keyed record of usage.
// ---------------------------------------------------------------------------

interface ElasticBucket {
  key: string;
  NumJobs: ElasticValueAgg;
  CpuHours: ElasticValueAgg;
  GpuHours: ElasticValueAgg;
  FileTransferCount: ElasticValueAgg;
  ByteTransferCount: ElasticValueAgg;
  OSDFFileTransferCount: ElasticValueAgg;
  OSDFByteTransferCount: ElasticValueAgg;
  NumProjects?: ElasticTermsAgg;
  NumDetailedFieldOfScience?: ElasticTermsAgg;
  CommonFields?: {
    hits: { hits: { _source: Record<string, unknown> }[] };
  };
}

interface BucketResponse {
  aggregations: { bucket: { buckets: ElasticBucket[] } };
}

export interface ProjectUsage {
  projectName: string;
  numJobs: number;
  cpuHours: number;
  gpuHours: number;
  fileTransferCount: number;
  byteTransferCount: number;
  osdfFileTransferCount: number;
  osdfByteTransferCount: number;
  broadFieldOfScience?: string;
  majorFieldOfScience?: string;
  detailedFieldOfScience?: string;
  projectInstitutionName?: string;
  projectInstitutionState?: string;
}

export interface InstitutionUsage {
  institutionName: string;
  numJobs: number;
  cpuHours: number;
  gpuHours: number;
  fileTransferCount: number;
  byteTransferCount: number;
  numProjects: number;
  numDetailedFieldOfScience: number;
  institutionState?: string;
}

/** Topology metadata for a project (PI, organization, description, …). */
export interface TopologyProject {
  Name: string;
  PIName?: string;
  Organization?: string;
  Description?: string;
  FieldOfScience?: string;
  InstitutionID?: string;
}

export type MergedProject = ProjectUsage & Partial<TopologyProject>;

const SUM_AGGS = {
  NumJobs: sumAgg('NumJobs'),
  CpuHours: sumAgg('CpuHours'),
  GpuHours: sumAgg('GpuHours'),
  FileTransferCount: sumAgg('FileTransferCount'),
  ByteTransferCount: sumAgg('ByteTransferCount'),
  OSDFFileTransferCount: sumAgg('OSDFFileTransferCount'),
  OSDFByteTransferCount: sumAgg('OSDFByteTransferCount'),
};

const topHits = (includes: string[]) => ({
  top_hits: { _source: { includes }, size: 1 },
});

/** Read a nested value out of a bucket's `CommonFields` top-hit `_source`. */
function fromCommonField(
  bucket: ElasticBucket,
  ...path: string[]
): string | undefined {
  let value: unknown = bucket.CommonFields?.hits?.hits?.[0]?._source;
  for (const key of path) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return value === undefined ? undefined : String(value);
}

/** The most recent date present in the summary index. */
export async function getDateOfLatestData(): Promise<Date> {
  const result = await elasticSearch<{
    hits: { hits: { _source: { Date: number } }[] };
  }>({
    size: 1,
    sort: [{ Date: { order: 'desc' } }],
  });
  return new Date(result.hits.hits[0]._source.Date);
}

/** Per-project usage aggregated across a date range. */
export async function getProjects(
  startTime: number,
  endTime: number
): Promise<Record<string, ProjectUsage>> {
  const { aggregations } = await elasticSearch<BucketResponse>({
    size: 0,
    query: { range: { Date: { gte: startTime, lte: endTime } } },
    aggs: {
      bucket: {
        terms: { field: 'ProjectName.keyword', size: 10000 },
        aggs: {
          ...SUM_AGGS,
          CommonFields: topHits([
            'BroadFieldOfScience',
            'MajorFieldOfScience',
            'DetailedFieldOfScience',
            'ProjectInstitution.name',
            'ProjectInstitution.state',
          ]),
        },
      },
    },
  });

  return aggregations.bucket.buckets.reduce<Record<string, ProjectUsage>>(
    (acc, b) => {
      acc[b.key] = {
        projectName: b.key,
        numJobs: b.NumJobs.value,
        cpuHours: b.CpuHours.value,
        gpuHours: b.GpuHours.value,
        fileTransferCount: b.FileTransferCount.value,
        byteTransferCount: b.ByteTransferCount.value,
        osdfFileTransferCount: b.OSDFFileTransferCount.value,
        osdfByteTransferCount: b.OSDFByteTransferCount.value,
        broadFieldOfScience: fromCommonField(b, 'BroadFieldOfScience'),
        majorFieldOfScience: fromCommonField(b, 'MajorFieldOfScience'),
        detailedFieldOfScience: fromCommonField(b, 'DetailedFieldOfScience'),
        projectInstitutionName: fromCommonField(b, 'ProjectInstitution', 'name'),
        projectInstitutionState: fromCommonField(b, 'ProjectInstitution', 'state'),
      };
      return acc;
    },
    {}
  );
}

/** Per-institution usage aggregated across a date range. */
export async function getInstitutions(
  startTime: number,
  endTime: number
): Promise<Record<string, InstitutionUsage>> {
  const { aggregations } = await elasticSearch<BucketResponse>({
    size: 0,
    query: { range: { Date: { gte: startTime, lte: endTime } } },
    aggs: {
      bucket: {
        terms: { field: 'ResourceInstitution.name.keyword', size: 10000 },
        aggs: {
          ...SUM_AGGS,
          NumProjects: termsAgg('ProjectName.keyword'),
          NumDetailedFieldOfScience: termsAgg('DetailedFieldOfScience.keyword'),
          CommonFields: topHits(['ResourceInstitution.state']),
        },
      },
    },
  });

  return aggregations.bucket.buckets.reduce<Record<string, InstitutionUsage>>(
    (acc, b) => {
      acc[b.key] = {
        institutionName: b.key,
        numJobs: b.NumJobs.value,
        cpuHours: b.CpuHours.value,
        gpuHours: b.GpuHours.value,
        fileTransferCount: b.FileTransferCount.value,
        byteTransferCount: b.ByteTransferCount.value,
        numProjects: b.NumProjects?.buckets.length ?? 0,
        numDetailedFieldOfScience: b.NumDetailedFieldOfScience?.buckets.length ?? 0,
        institutionState: fromCommonField(b, 'ResourceInstitution', 'state'),
      };
      return acc;
    },
    {}
  );
}

/** Institutions that provided resources to a given project (last year). */
export async function getProjectOverview(
  projectName: string
): Promise<Record<string, ProjectUsage>> {
  const now = Date.now();
  const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).getTime();

  const { aggregations } = await elasticSearch<BucketResponse>({
    size: 0,
    query: {
      bool: {
        filter: [
          { range: { Date: { gte: oneYearAgo, lte: now } } },
          { term: { 'ProjectName.keyword': projectName } },
        ],
      },
    },
    aggs: {
      bucket: {
        terms: { field: 'ResourceInstitution.name.keyword', size: 10000 },
        aggs: SUM_AGGS,
      },
    },
  });

  return aggregations.bucket.buckets.reduce<Record<string, ProjectUsage>>(
    (acc, b) => {
      acc[b.key] = {
        projectName: b.key,
        numJobs: b.NumJobs.value,
        cpuHours: b.CpuHours.value,
        gpuHours: b.GpuHours.value,
        fileTransferCount: b.FileTransferCount.value,
        byteTransferCount: b.ByteTransferCount.value,
        osdfFileTransferCount: b.OSDFFileTransferCount.value,
        osdfByteTransferCount: b.OSDFByteTransferCount.value,
      };
      return acc;
    },
    {}
  );
}

/** Projects supported by a given institution (last year). */
export async function getInstitutionOverview(
  institutionName: string
): Promise<Record<string, ProjectUsage>> {
  const now = Date.now();
  const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).getTime();

  const { aggregations } = await elasticSearch<BucketResponse>({
    size: 0,
    query: {
      bool: {
        filter: [
          { range: { Date: { gte: oneYearAgo, lte: now } } },
          { term: { 'ResourceInstitution.name.keyword': institutionName } },
        ],
      },
    },
    aggs: {
      bucket: {
        terms: { field: 'ProjectName.keyword', size: 10000 },
        aggs: {
          ...SUM_AGGS,
          CommonFields: topHits([
            'DetailedFieldOfScience',
            'ProjectInstitution.name',
          ]),
        },
      },
    },
  });

  return aggregations.bucket.buckets.reduce<Record<string, ProjectUsage>>(
    (acc, b) => {
      acc[b.key] = {
        projectName: b.key,
        numJobs: b.NumJobs.value,
        cpuHours: b.CpuHours.value,
        gpuHours: b.GpuHours.value,
        fileTransferCount: b.FileTransferCount.value,
        byteTransferCount: b.ByteTransferCount.value,
        osdfFileTransferCount: b.OSDFFileTransferCount.value,
        osdfByteTransferCount: b.OSDFByteTransferCount.value,
        detailedFieldOfScience: fromCommonField(b, 'DetailedFieldOfScience'),
        projectInstitutionName: fromCommonField(b, 'ProjectInstitution', 'name'),
      };
      return acc;
    },
    {}
  );
}

/** Project metadata from the OSG topology service, keyed by project name. */
export async function getTopologyProjects(): Promise<
  Record<string, TopologyProject>
> {
  const response = await fetch(
    'https://topology.opensciencegrid.org/miscproject/json'
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch topology data: ${response.status}`);
  }
  return response.json();
}

/**
 * Merge topology project metadata with adstash usage data, keeping only
 * projects present in both (matching the legacy projects page behaviour).
 */
export async function getMergedProjects(): Promise<MergedProject[]> {
  const recordEnd = await getDateOfLatestData();
  const oneYearAgo = new Date(
    new Date(recordEnd).setFullYear(recordEnd.getFullYear() - 1)
  );

  const [topology, usage] = await Promise.all([
    getTopologyProjects(),
    getProjects(oneYearAgo.getTime(), recordEnd.getTime()),
  ]);

  const merged: MergedProject[] = [];
  for (const [name, meta] of Object.entries(topology)) {
    if (name in usage) {
      merged.push({ ...meta, ...usage[name] });
    }
  }
  return merged;
}

/** Most recent year of per-institution usage (for the institutions page). */
export async function getInstitutionsForRange(): Promise<InstitutionUsage[]> {
  const recordEnd = await getDateOfLatestData();
  const oneYearAgo = new Date(
    new Date(recordEnd).setFullYear(recordEnd.getFullYear() - 1)
  );
  const institutions = await getInstitutions(
    oneYearAgo.getTime(),
    recordEnd.getTime()
  );
  return Object.values(institutions);
}

/** Most recent year of per-project usage (for the OSDF projects page). */
export async function getProjectsForRange(): Promise<ProjectUsage[]> {
  const recordEnd = await getDateOfLatestData();
  const oneYearAgo = new Date(
    new Date(recordEnd).setFullYear(recordEnd.getFullYear() - 1)
  );
  const projects = await getProjects(oneYearAgo.getTime(), recordEnd.getTime());
  return Object.values(projects);
}

// Build-time memoized variants. The static project/institution pages each
// need the shared project/institution/topology lists to recover a name from
// its slug; memoizing dedupes those fetches to once per build worker (the data
// is a fixed yearly snapshot for the process lifetime).
let _topologyProjectsCache: Promise<Record<string, TopologyProject>> | undefined;
export function getTopologyProjectsCached(): Promise<Record<string, TopologyProject>> {
  return (_topologyProjectsCache ??= getTopologyProjects());
}

let _projectsForRangeCache: Promise<ProjectUsage[]> | undefined;
export function getProjectsForRangeCached(): Promise<ProjectUsage[]> {
  return (_projectsForRangeCache ??= getProjectsForRange());
}

let _institutionsForRangeCache: Promise<InstitutionUsage[]> | undefined;
export function getInstitutionsForRangeCached(): Promise<InstitutionUsage[]> {
  return (_institutionsForRangeCache ??= getInstitutionsForRange());
}

/** Bytes → human-readable string, e.g. 1500000 → "2 MB". */
const BYTE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '—';
  const k = 1000;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(0));
  return `${value} ${BYTE_UNITS[i]}`;
}

// ---------------------------------------------------------------------------
// OSDF data repositories — sourced from the shared fabaid.io endpoint so the
// data lives in one place (mirrors the legacy `osdf_namespace_metadata`).
// ---------------------------------------------------------------------------

export interface DataRepository {
  id: string;
  name: string;
  organization?: string;
  fieldOfScience?: string;
  description?: string;
  size?: number | null;
  oneYearReads?: number | null;
  numberOfDatasets?: number | null;
  rank?: number;
  publicObject?: string | null;
  organizationUrl?: string | null;
  repositoryUrl?: { url: string; label?: string | null } | null;
}

// ---------------------------------------------------------------------------
// Facility-level usage (institutions & CC* pages), from the GRACC endpoint
// merged with the OSG topology facility metadata.
// ---------------------------------------------------------------------------

export interface FacilityUsage {
  name: string;
  jobsRan: number;
  cpuProvided: number;
  gpuProvided: number;
  numProjects: number;
  numFieldsOfScience: number;
  numOrganizations: number;
}

interface TopologyFacility {
  Name: string;
  IsCCStar?: boolean;
  ID?: number;
}

export type MergedFacility = FacilityUsage & TopologyFacility;

interface FacilityAggBucket {
  key: string;
  facilityCpuProvided: ElasticValueAgg;
  facilityJobsRan: ElasticValueAgg;
  facilityGpuProvided: ElasticValueAgg;
  countProjectsImpacted: ElasticValueAgg;
  countFieldsOfScienceImpacted: ElasticValueAgg;
  countOrganizationImpacted: ElasticValueAgg;
}

/** Per-facility usage from GRACC over the last year (excluding the GLOW project). */
async function getFacilityEsData(): Promise<Record<string, FacilityUsage>> {
  const now = Date.now();
  const oneYearAgo = new Date(
    new Date().setFullYear(new Date().getFullYear() - 1)
  ).getTime();

  const response = await elasticSearch<{
    aggregations: { facilities: { buckets: FacilityAggBucket[] } };
  }>(
    {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { ResourceType: 'Payload' } },
            { range: { EndTime: { lte: now, gte: oneYearAgo } } },
          ],
          must_not: [{ term: { ProjectName: 'GLOW' } }],
        },
      },
      aggs: {
        facilities: {
          terms: { field: 'OIM_Facility', size: 99999999 },
          aggs: {
            facilityCpuProvided: sumAgg('CoreHours'),
            facilityJobsRan: sumAgg('Count'),
            facilityGpuProvided: sumAgg('GPUHours'),
            countProjectsImpacted: { cardinality: { field: 'ProjectName' } },
            countFieldsOfScienceImpacted: {
              cardinality: { field: 'OIM_FieldOfScience' },
            },
            countOrganizationImpacted: {
              cardinality: { field: 'OIM_Organization' },
            },
            gpu_bucket_filter: {
              bucket_selector: {
                buckets_path: {
                  totalGPU: 'facilityGpuProvided',
                  totalCPU: 'facilityCpuProvided',
                },
                script: 'params.totalGPU > 0 || params.totalCPU > 0',
              },
            },
          },
        },
      },
    },
    GRACC_SUMMARY_INDEX,
    GRACC_ENDPOINT
  );

  return response.aggregations.facilities.buckets.reduce<
    Record<string, FacilityUsage>
  >((acc, b) => {
    acc[b.key] = {
      name: b.key,
      jobsRan: b.facilityJobsRan.value,
      cpuProvided: b.facilityCpuProvided.value,
      gpuProvided: b.facilityGpuProvided.value,
      numProjects: b.countProjectsImpacted.value,
      numFieldsOfScience: b.countFieldsOfScienceImpacted.value,
      numOrganizations: b.countOrganizationImpacted.value,
    };
    return acc;
  }, {});
}

async function getFacilityTopology(): Promise<Record<string, TopologyFacility>> {
  const response = await fetch(
    'https://topology.opensciencegrid.org/miscfacility/json'
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch facility topology: ${response.status}`);
  }
  return response.json();
}

/**
 * Facilities that contributed in the last year, merged with topology metadata.
 * When `ccStarOnly` is set, restrict to CC* facilities (matching the legacy
 * campus-cyberinfrastructure page).
 */
export async function getFacilities(
  ccStarOnly = false
): Promise<MergedFacility[]> {
  const [usage, topology] = await Promise.all([
    getFacilityEsData(),
    getFacilityTopology(),
  ]);

  const merged: MergedFacility[] = [];
  for (const [name, meta] of Object.entries(topology)) {
    if (!(name in usage)) continue;
    if (ccStarOnly && (!meta.IsCCStar || name === 'New Mexico State University')) {
      continue;
    }
    merged.push({ ...usage[name], ...meta });
  }
  return merged;
}

/** Fetch the displayable OSDF data repositories, highest-rank first. */
export async function getDataRepositories(): Promise<DataRepository[]> {
  const response = await fetch('https://fabaid.io/data/data-repositories.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch data repositories: ${response.status}`);
  }
  const json: Record<string, DataRepository & { display?: boolean }> =
    await response.json();

  return Object.entries(json)
    .filter(([, v]) => v.display && v.name)
    .map(([id, v]) => ({ ...v, id }))
    .sort(
      (a, b) =>
        (b.rank ?? 0) + (b.publicObject ? 10 : 0) -
        ((a.rank ?? 0) + (a.publicObject ? 10 : 0))
    );
}
