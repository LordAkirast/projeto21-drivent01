import { Address, Enrollment } from '@prisma/client';
import { request } from '@/utils/request';
import { notFoundError } from '@/errors';
import { addressRepository, CreateAddressParams, enrollmentRepository, CreateEnrollmentParams } from '@/repositories';
import { exclude } from '@/utils/prisma-utils';



let counter = 0;

async function getAddressFromCEP(cep: string) {
  try {
    // FIXME: está com CEP fixo! - hecho
    const result = await request.get(`${process.env.VIA_CEP_API}/${cep}/json/`);

    // TODO: Tratar regras de negócio e lançar eventuais erros
    const { logradouro, complemento, bairro, localidade, uf } = result.data;

    return {
      logradouro,
      complemento,
      bairro,
      cidade: localidade, // Renomear para "cidade" se necessário
      uf,
    };
  } catch (error) {
    console.error('Erro ao obter endereço do CEP:', error);
    throw new Error('Erro ao obter endereço do CEP');
  }
}

function getCounterValue() {
  return counter;
}

async function getOneWithAddressByUserId(userId: number): Promise<GetOneWithAddressByUserIdResult> {
  const enrollmentWithAddress = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollmentWithAddress) throw notFoundError();

  const [firstAddress] = enrollmentWithAddress.Address;
  const address = getFirstAddress(firstAddress);

  return {
    ...exclude(enrollmentWithAddress, 'userId', 'createdAt', 'updatedAt', 'Address'),
    ...(!!address && { address }),
  };
}

type GetOneWithAddressByUserIdResult = Omit<Enrollment, 'userId' | 'createdAt' | 'updatedAt'>;

function getFirstAddress(firstAddress: Address): GetAddressResult {
  if (!firstAddress) return null;

  return exclude(firstAddress, 'createdAt', 'updatedAt', 'enrollmentId');
}

type GetAddressResult = Omit<Address, 'createdAt' | 'updatedAt' | 'enrollmentId'>;

async function createOrUpdateEnrollmentWithAddress(params: CreateOrUpdateEnrollmentWithAddress) {
  const enrollment = exclude(params, 'address');
  enrollment.birthday = new Date(enrollment.birthday);
  const address = getAddressForUpsert(params.address);

  const cep = params.address.cep;
  if (!isValidCEP(cep)) {
    console.error('CEP inválido:', cep);
    throw new Error('CEP inválido');
  }

  const newEnrollment = await enrollmentRepository.upsert(params.userId, enrollment, exclude(enrollment, 'userId'));

  await addressRepository.upsert(newEnrollment.id, address, address);
}

function isValidCEP(cep: string): boolean {
  const numericCEP = cep.replace(/\D/g, '');

  return numericCEP.length === 8;
}

function getAddressForUpsert(address: CreateAddressParams) {
  return {
    ...address,
    ...(address?.addressDetail && { addressDetail: address.addressDetail }),
  };
}

export type CreateOrUpdateEnrollmentWithAddress = CreateEnrollmentParams & {
  address: CreateAddressParams;
};

export const enrollmentsService = {
  getOneWithAddressByUserId,
  createOrUpdateEnrollmentWithAddress,
  getAddressFromCEP,
  getCounterValue,
};
