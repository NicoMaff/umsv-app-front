import { Dispatch, FormEvent, SetStateAction, useContext, useRef, useState } from "react";
import { ValidationError } from "yup";
import { mutate } from "swr";
import { IUser } from "../../../interfaces/interfaces";
import Switch from "../../components/Switch";
import { userSchema } from "../../../validations/userSchema";
import { AuthenticationContext } from "../../../contexts/AuthenticationContext";
import useAxiosPrivateMultipart from "../../../hooks/useAxiosPrivateMultipart";
import { formatDate } from "../../../utils/dateFunctions";

interface IProps {
  patchMethod?: boolean;
  focusedUser?: IUser;
  isModalActive?: boolean;
  setIsModalActive?: Dispatch<SetStateAction<boolean>>;
  setRequestMessage: Dispatch<SetStateAction<{ success: string; error: string }>>;
}

interface IFormErrors {
  lastName: string;
  firstName: string;
  email: string;
  roles: string;
  gender: string;
  birthDate: string;
  state: string;
  validatedAccount: string;
}

const UserForm = ({
  patchMethod,
  focusedUser,
  setRequestMessage,
  isModalActive,
  setIsModalActive,
}: IProps) => {
  //
  const axiosPrivateMultipart = useAxiosPrivateMultipart();
  const { user } = useContext(AuthenticationContext);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  // const { rolesRef } = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLSelectElement>(null);
  const validatedAccountRef = useRef<HTMLInputElement>(null);
  const [userTypeSelected, setUserTypeSelected] = useState(
    focusedUser?.roles?.includes("ROLE_SUPERADMIN") || focusedUser?.roles?.includes("ROLE_ADMIN")
      ? "admin"
      : "member"
  );
  const [validatedAccount, setValidatedAccount] = useState(focusedUser?.validatedAccount || false);
  const [formErrors, setFormErrors] = useState({} as IFormErrors);

  console.log(userTypeSelected);

  /** Validation of form fields before fetch the post route */
  const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let errors = {} as IFormErrors;

    /** Body of post request */
    const bodyRequest = {
      lastName: lastNameRef.current!.value,
      firstName: firstNameRef.current!.value,
      email: emailRef.current!.value,
      passwordAutoGenerated: true,
      roles: user?.roles.includes("ROLE_SUPERADMIN")
        ? userTypeSelected === "admin"
          ? ["ROLE_ADMIN", "ROLE_MEMBER"]
          : ["ROLE_MEMBER"]
        : undefined,
      // roles: rolesRef.current?.value || ["ROLE_MEMBER"],
      gender: genderRef.current?.value === "default" ? undefined : genderRef.current?.value,
      birthDate: birthDateRef.current?.valueAsDate || undefined,
      state: stateRef.current?.value || "inactive",
      validatedAccount: validatedAccount,
    };

    console.log(bodyRequest);

    await userSchema
      .validate(bodyRequest, { abortEarly: false })
      .then(async () => {
        isModalActive && setIsModalActive?.(false);
        if (!patchMethod) {
          await mutate(
            "/admin/users",
            await axiosPrivateMultipart
              .post(
                user?.roles.includes("ROLE_SUPERADMIN")
                  ? "/admin/user/admin"
                  : "/admin/user/member",
                bodyRequest
              )
              .then((res) => {
                setRequestMessage({
                  error: "",
                  success: `Le compte utilisateur de ${res.data.firstName?.toUpperCase()} a bien été créé ! 👌`,
                });
                return res.data;
              })
              .catch((err) => {
                console.error(err);
                setRequestMessage({
                  error: `Une erreur est survenue lors de la création du compte utilisateur 🤕.`,
                  success: "",
                });
              }),
            {
              optimisticData: (all: Array<IUser>) =>
                [...all, bodyRequest as IUser].sort(
                  (a: IUser, b: IUser) =>
                    Number(new Date(b.updatedAt || b.createdAt)) -
                    Number(new Date(a.updatedAt || a.createdAt))
                ),
              populateCache: (result: IUser, current: Array<IUser>) => [...current, result],
            }
          );
        } else {
          await mutate(
            "/admin/users",
            await axiosPrivateMultipart
              .patch(
                user?.roles.includes("ROLE_SUPERADMIN")
                  ? `/admin/user/admin/${focusedUser?.id}`
                  : `/admin/user/member${focusedUser?.id}`,
                bodyRequest
              )
              .then((res) => {
                setRequestMessage({
                  error: "",
                  success: `Le compte utilisateur de ${res.data.firstName?.toUpperCase()} a bien été modifié ! 👌`,
                });
                return res.data;
              })
              .catch((err) => {
                console.error(err);
                setRequestMessage({
                  error: `Une erreur est survenue lors de la modification du compte utilisateur de ${focusedUser?.firstName?.toUpperCase()}`,
                  success: "",
                });
              }),
            {
              optimisticData: (all: Array<IUser>) => {
                const prev = all.filter((item: IUser) => item.id !== focusedUser?.id);
                return [...prev, { ...focusedUser, ...bodyRequest } as IUser].sort(
                  (a: IUser, b: IUser) =>
                    Number(new Date(b.updatedAt || b.createdAt)) -
                    Number(new Date(a.updatedAt || a.createdAt))
                );
              },
              populateCache: (result: IUser, current: Array<IUser>) => {
                const prev = current.filter((item: IUser) => item.id !== focusedUser?.id);
                return [...prev, result];
              },
              rollbackOnError: true,
              revalidate: false,
            }
          );
        }
        setTimeout(() => {
          setRequestMessage({ success: "", error: "" });
        }, 10000);
        window.scrollTo(0, 0);
      })
      .catch((err) => {
        console.log(err);

        err.inner.forEach(
          (err: ValidationError) => (errors = { ...errors, [err.path as string]: err.message })
        );
      });

    setFormErrors(errors);
  };

  return (
    <form className="form registration-form" onSubmit={handleSubmitForm}>
      <div className="form-row">
        <label htmlFor="userLastName">Nom de l&apos;utilisateur</label>
        {formErrors.lastName && <div className="form-error-detail">{formErrors.lastName}</div>}
        <input
          type="text"
          id="userLastName"
          className={formErrors.lastName ? "form-error" : undefined}
          autoFocus
          defaultValue={focusedUser?.lastName || undefined}
          ref={lastNameRef}
        />
      </div>

      <div className="form-row">
        <label htmlFor="userFirstName">Prénom de l&apos;utilisateur</label>
        {formErrors.firstName && <div className="form-error-detail">{formErrors.firstName}</div>}
        <input
          type="text"
          id="userFirstName"
          className={formErrors.firstName ? "form-error" : undefined}
          defaultValue={focusedUser?.firstName || undefined}
          ref={firstNameRef}
        />
      </div>

      <div className="form-row">
        <label htmlFor="userEmail">Email de l&apos;utilisateur</label>
        {formErrors.email && <div className="form-error-detail">{formErrors.email}</div>}
        <input
          type="email"
          id="userEmail"
          className={formErrors.email ? "form-error" : undefined}
          defaultValue={focusedUser?.email || undefined}
          ref={emailRef}
        />
      </div>

      {user?.roles.includes("ROLE_SUPERADMIN") && (
        <div className="form-row">
          <label>Type d&apos;utilisateur</label>
          <div className="radio-container">
            <div>
              <input
                type="radio"
                name="userType"
                id="adminType"
                checked={userTypeSelected === "admin" ? true : false}
                onChange={() => setUserTypeSelected("admin")}
              />
              <label htmlFor="adminType">Admin</label>
            </div>
            <div>
              <input
                type="radio"
                name="userType"
                id="memberType"
                checked={userTypeSelected === "member" ? true : false}
                onChange={() => setUserTypeSelected("member")}
              />
              <label htmlFor="memberType">Membre</label>
            </div>
          </div>
        </div>
      )}

      <div className="form-row">
        <label htmlFor="userGender">Genre de l&apos;utilisateur</label>
        {formErrors.gender && <div className="form-error-detail">{formErrors.gender}</div>}
        <select
          id="userGender"
          className={formErrors.gender ? "form-error" : undefined}
          defaultValue={focusedUser?.gender || "default"}
          ref={genderRef}
        >
          <option value="default">---</option>
          <option value="male">Masculin</option>
          <option value="female">Féminin</option>
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="userBirthDate">Date de naissance de l&apos;utilisateur</label>
        {formErrors.birthDate && <div className="form-error-detail">{formErrors.birthDate}</div>}
        <input
          type="date"
          id="userBirthDate"
          className={formErrors.gender ? "form-error" : undefined}
          defaultValue={formatDate(String(focusedUser?.birthDate), undefined, "XXXX-XX-XX")}
          ref={birthDateRef}
        />
      </div>

      <div className="form-row">
        <label htmlFor="userState">État du compte de l&apos;utilisateur</label>
        {formErrors.birthDate && <div className="form-error-detail">{formErrors.birthDate}</div>}
        <select
          id="userState"
          className={formErrors.gender ? "form-error" : undefined}
          defaultValue={focusedUser?.state}
          ref={stateRef}
        >
          <option value="pending">En attente</option>
          <option value="active">Activé</option>
          <option value="inactive">Désactivé</option>
        </select>
      </div>

      <div className="form-row">
        <label>Validation du compte</label>
        <div className="switch-identifier">
          <span style={{ cursor: "pointer" }} onClick={() => setValidatedAccount(false)}>
            Non valide
          </span>
          <Switch
            customName="toggle-active"
            isActive={validatedAccount}
            setIsActive={setValidatedAccount}
          />
          <span style={{ cursor: "pointer" }} onClick={() => setValidatedAccount(true)}>
            Validé
          </span>
        </div>
      </div>

      <input
        type="submit"
        value={(patchMethod ? "Modifier" : "Créer") + " la demande d'inscription"}
        className="btn btn-primary"
      />
    </form>
  );
};

export default UserForm;
