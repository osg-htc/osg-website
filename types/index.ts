export type DataVisibility = 'public' | 'private';

export type RepositoryUrl = {
  url: string;
  label: string;
};

export type DataRepository = {
  id: string;
  description: string;
  organization: string;
  dataVisibility: DataVisibility;
  size: number | null;
  objectCount: number | null;
  fieldOfScience: string;
  numberOfDatasets: number;
  rank: number;
  inprogress: boolean;
  display: boolean;
  name: string;
  namespace: string[];
  thirtyDayReads: number | null;
  oneYearReads: number | null;
  organizationUrl: string | null;
  repositoryUrl: RepositoryUrl | null;
  publicObject: string | null;
};
