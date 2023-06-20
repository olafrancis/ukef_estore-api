import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import SharepointConfig from '@ukef/config/sharepoint.config';
import { UkefSiteId } from '@ukef/helpers/ukef-id.type';
import { GraphCreateSiteResponseDto } from '@ukef/modules/graph/dto/graph-create-site-response.dto';
import { GraphGetSiteStatusByExporterNameResponseDto } from '@ukef/modules/graph/dto/graph-get-site-status-by-exporter-name-response.dto';
import { GraphService } from '@ukef/modules/graph/graph.service';

import { CreateSiteResponse } from './dto/create-site-response.dto';
import { GetSiteStatusByExporterNameResponse } from './dto/get-site-status-by-exporter-name-response.dto';
import { SiteNotFoundException } from './exception/site-not-found.exception';

type RequiredConfigKeys = 'ukefSharepointName' | 'tfisSiteName' | 'tfisListId';

@Injectable()
export class SiteService {
  constructor(
    @Inject(SharepointConfig.KEY)
    private readonly config: Pick<ConfigType<typeof SharepointConfig>, RequiredConfigKeys>,
    private readonly graphService: GraphService,
  ) {}

  async getSiteStatusByExporterName(exporterName: string): Promise<GetSiteStatusByExporterNameResponse> {
    const data = await this.graphService.get<GraphGetSiteStatusByExporterNameResponseDto>({
      path: `sites/${this.config.ukefSharepointName}:/sites/${this.config.tfisSiteName}:/lists/${this.config.tfisListId}/items`,
      filter: `fields/Title eq '${exporterName}'`,
      expand: 'fields($select=Title,Url,SiteStatus)',
    });

    if (!data.value.length) {
      throw new SiteNotFoundException(`Site not found for exporter name: ${exporterName}`);
    }

    const { URL: siteId, Sitestatus: status } = data.value[0].fields;
    return { siteId, status };
  }

  async createSite(exporterName: string, newSiteId: string): Promise<CreateSiteResponse> {
    const data = await this.graphService.post<GraphCreateSiteResponseDto>({
      path: `sites/${this.config.ukefSharepointName}:/sites/${this.config.tfisSiteName}:/lists/${this.config.tfisListId}/items`,
      requestBody: {
        fields: {
          Title: exporterName,
          URL: newSiteId,
          HomePage: exporterName,
          Description: exporterName,
        },
      },
    });

    const { URL: siteId, Sitestatus: status } = data.fields;
    return { siteId: siteId as UkefSiteId, status };
  }

  // TODO: APIM-454 temporary helper to be replaced by MDM API POST /numbers.
  mockSiteIdGeneration() {
    return '03' + (Math.round(Math.random() * 899999) + 100000).toString();
  }
}
