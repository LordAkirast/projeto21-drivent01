import { Response } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '@/middlewares';
import { enrollmentsService } from '@/services';

export async function getEnrollmentByUser(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;

  const enrollmentWithAddress = await enrollmentsService.getOneWithAddressByUserId(userId);

  return res.status(httpStatus.OK).send(enrollmentWithAddress);
}
///enrollments

export async function postCreateOrUpdateEnrollment(req: AuthenticatedRequest, res: Response) {
  await enrollmentsService.createOrUpdateEnrollmentWithAddress({
    ...req.body,
    userId: req.userId,
  });

  return res.sendStatus(httpStatus.OK);
}

// TODO - Receber o CEP do usuário por query params. - hecho
export async function getAddressFromCEP(req: AuthenticatedRequest, res: Response) {
  try {
    const cep = req.query.cep as string;

    if (!cep) {
      return res.status(httpStatus.BAD_REQUEST).send('CEP não fornecido');
    }

    const address = await enrollmentsService.getAddressFromCEP(cep);

    if (
      address.logradouro === undefined &&
      address.complemento === undefined &&
      address.bairro === undefined &&
      address.cidade === undefined &&
      address.uf === undefined
    ) {
      console.log('ENDEREÇO NÃO ENCONTRADO');
      return res.status(httpStatus.BAD_REQUEST).send('ENDEREÇO NÃO ENCONTRADO');
    }

    res.status(httpStatus.OK).send(address);
  } catch (error) {
    console.log('erruuu', error)

    if (error.status = 400) {
      res.status(httpStatus.BAD_REQUEST).send('CEP INVÁLIDO');

    } else {

      res.status(httpStatus.INTERNAL_SERVER_ERROR).send('Erro ao obter o endereço do CEP');
    }
  }
}


