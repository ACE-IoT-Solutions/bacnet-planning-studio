import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure, createSubnet, getDiagramDiagnostics } from './network-diagram';
import { getPhysicalDiagnostics } from './physical-diagnostics';
import { createArcnetSegment, createLink, createLocation, createMstpSegment, createPortRange } from './physical';
import { ARC156_BAUD } from './physical-limits';

function physicalProject() {
  const project = createDefaultProject();
  project.physical.enabled = true;
  const sw = createInfrastructure(); sw.kind = 'switch'; sw.name = 'Access switch'; sw.poeBudgetWatts = 20;
  sw.ports = createPortRange('Gi', 1, 3, { vlanMode: 'access', accessVlan: '10', poe: 'af' });
  project.infrastructure.push(sw);
  const [a, b] = project.subnets[0].devices;
  project.physical.links.push(
    createLink({ kind: 'device-nic', deviceId: a.id, nicId: a.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id }),
    createLink({ kind: 'device-nic', deviceId: b.id, nicId: b.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[1].id })
  );
  return { project, sw, a, b };
}

describe('physical diagnostics gating', () => {
  it('does not add findings to an untouched logical project', () => expect(getPhysicalDiagnostics(createDefaultProject())).toEqual([]));
  it('reports uncabled BACnet NICs as hidden-by-default information', () => {
    const project = createDefaultProject(); project.physical.enabled = true;
    expect(getPhysicalDiagnostics(project)).toContainEqual(expect.objectContaining({ level: 'info', code: 'PHY-NIC-UNCABLED' }));
  });
});

describe('physical link diagnostics', () => {
  it('checks media, reach, duplicate use, dangling endpoints, and access VLANs', () => {
    const { project, sw, a } = physicalProject();
    project.physical.links[0].media = 'fiber-sm';
    project.physical.links[0].lengthMeters = 11000;
    project.physical.links.push(createLink(
      { kind: 'device-nic', deviceId: a.id, nicId: a.nics[0].id },
      { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports![2].id }
    ));
    project.physical.links.push(createLink(
      { kind: 'device-nic', deviceId: 'missing', nicId: 'missing' },
      { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports![2].id }
    ));
    sw.ports![1].accessVlan = '99';
    const codes = getPhysicalDiagnostics(project).map(item => item.code);
    expect(codes).toEqual(expect.arrayContaining(['PHY-LINK-MEDIA', 'PHY-LINK-LENGTH', 'PHY-PORT-DOUBLE', 'PHY-LINK-DANGLING', 'PHY-PORT-VLAN']));
  });

  it('checks trunk symmetry and disconnected same-subnet islands', () => {
    const { project, sw } = physicalProject();
    const second = createInfrastructure(); second.kind = 'switch'; second.ports = createPortRange('Gi', 1, 2, { vlanMode: 'trunk', allowedVlans: ['10'] });
    sw.ports![2].vlanMode = 'trunk'; sw.ports![2].allowedVlans = ['10', '20'];
    project.infrastructure.push(second);
    project.physical.links.push(createLink(
      { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports![2].id },
      { kind: 'infrastructure-port', infrastructureId: second.id, portId: second.ports[0].id }
    ));
    expect(getPhysicalDiagnostics(project).map(item => item.code)).toContain('PHY-TRUNK-VLAN');
    project.physical.links.pop();
    expect(getPhysicalDiagnostics(project).map(item => item.code)).not.toContain('PHY-L2-PATH');
  });

  it('reports two cabled NICs on disconnected switches as an L2 path gap', () => {
    const { project, sw, b } = physicalProject();
    const second = createInfrastructure(); second.kind = 'switch'; second.ports = createPortRange('Gi', 1, 1, { vlanMode: 'access', accessVlan: '10' });
    project.infrastructure.push(second);
    const bLink = project.physical.links.find(link => link.a.kind === 'device-nic' && link.a.deviceId === b.id)!;
    bLink.b = { kind: 'infrastructure-port', infrastructureId: second.id, portId: second.ports[0].id };
    expect(sw.id).not.toBe(second.id);
    expect(getPhysicalDiagnostics(project).map(item => item.code)).toContain('PHY-L2-PATH');
  });
});

describe('physical power diagnostics', () => {
  it('checks class support and total PoE budget', () => {
    const { project, a, b } = physicalProject();
    a.poeClass = 'bt-type4'; b.poeClass = 'at';
    expect(getPhysicalDiagnostics(project).map(item => item.code)).toEqual(expect.arrayContaining(['PHY-POE-CLASS', 'PHY-POE-BUDGET']));
  });
});

describe('serial wiring diagnostics', () => {
  it('checks MS/TP termination, bias, unit load, length, and membership', () => {
    const { project, a } = physicalProject();
    const mstp = createSubnet(2); mstp.networkType = 'mstp'; mstp.bacnetNetworkNumber = '2001'; project.subnets.push(mstp);
    const segment = createMstpSegment(mstp.id); segment.lengthMeters = 1300;
    segment.members = [{ ref: { kind: 'device', deviceId: a.id }, terminated: false, biasSource: false, unitLoad: 33 }];
    project.physical.mstpSegments.push(segment);
    expect(getPhysicalDiagnostics(project).map(item => item.code)).toEqual(expect.arrayContaining(['MSTP-BIAS', 'MSTP-NODES', 'MSTP-LENGTH', 'MSTP-SEGMENT-SUBNET']));
  });

  it('checks MS/TP end termination and router/repeater placement order', () => {
    const { project, a, b } = physicalProject();
    const mstp = createSubnet(2); mstp.networkType = 'mstp'; mstp.bacnetNetworkNumber = '2001'; mstp.devices = [a, b]; project.subnets[0].devices = []; project.subnets.push(mstp);
    for (const device of mstp.devices) device.nics[0].addresses[0].subnetId = mstp.id;
    const repeater = createInfrastructure(); repeater.kind = 'mstp-repeater'; project.infrastructure.push(repeater);
    const segment = createMstpSegment(mstp.id);
    segment.members = [
      { ref: { kind: 'device', deviceId: a.id }, terminated: false, biasSource: true },
      { ref: { kind: 'infrastructure', infrastructureId: repeater.id }, terminated: true, biasSource: false },
      { ref: { kind: 'device', deviceId: b.id }, terminated: false, biasSource: false }
    ];
    project.physical.mstpSegments.push(segment);
    expect(getPhysicalDiagnostics(project).map(item => item.code)).toEqual(expect.arrayContaining(['MSTP-TERM', 'MSTP-ORDER']));
  });

  it('models ALC ARC156 with its 610 m and 32-node segment constraints', () => {
    expect(ARC156_BAUD).toBe(156250);
    const { project, a, b } = physicalProject();
    const arcnet = createSubnet(2); arcnet.networkType = 'arcnet'; arcnet.bacnetNetworkNumber = '3001';
    arcnet.devices = [a, b]; project.subnets[0].devices = []; project.subnets.push(arcnet);
    for (const device of arcnet.devices) device.nics[0].addresses[0].subnetId = arcnet.id;
    const segment = createArcnetSegment(arcnet.id); segment.lengthMeters = 611;
    segment.members = [
      { ref: { kind: 'device', deviceId: a.id }, terminated: false, biasSource: false, unitLoad: 20 },
      { ref: { kind: 'device', deviceId: b.id }, terminated: false, biasSource: false, unitLoad: 20 }
    ];
    project.physical.arcnetSegments.push(segment);
    expect(getPhysicalDiagnostics(project).map(item => item.code)).toEqual(expect.arrayContaining(['ARCNET-TERM', 'ARCNET-NODES', 'ARCNET-LENGTH']));
  });
});

describe('location diagnostics', () => {
  it('finds parent cycles', () => {
    const { project } = physicalProject();
    const a = createLocation('A'); const b = createLocation('B'); a.parentId = b.id; b.parentId = a.id;
    project.physical.locations.push(a, b);
    expect(getDiagramDiagnostics(project).map(item => item.code)).toContain('LOC-CYCLE');
  });
});
