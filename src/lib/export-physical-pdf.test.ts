import { describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from './network-diagram';
import { appendPhysicalSchedulePages } from './export-physical-pdf';
import { createLink } from './physical';

describe('physical PDF schedules', () => {
  it('adds paginated cable schedule pages', () => {
    const project = createDefaultProject(); const [a, b] = project.subnets[0].devices;
    for (let index = 0; index < 30; index++) project.physical.links.push(createLink({ kind: 'device-nic', deviceId: a.id, nicId: a.nics[0].id }, { kind: 'device-nic', deviceId: b.id, nicId: b.nics[0].id }));
    const pdf = { addPage: vi.fn(), setFillColor: vi.fn(), rect: vi.fn(), setTextColor: vi.fn(), setFontSize: vi.fn(), text: vi.fn() };
    appendPhysicalSchedulePages(pdf as never, project, { projectTitle: 'Test', includeCables: true, includeSerial: false, theme: 'light' });
    expect(pdf.addPage).toHaveBeenCalledTimes(2);
  });
});
