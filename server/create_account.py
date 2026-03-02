from things.auth import create_engine, Session, HTTPException, Account, password_hash

engine = create_engine("sqlite:///db/auth.sqlite", connect_args={"check_same_thread": False})
with Session(engine) as session:
	print("등록하시게요?")
	username = input("사용자명 입력 > ")
	password = input("비밀번호 입력 > ")
	is_admin = bool(input("관리자 여부 입력(비워 두면 관리자 아님) > "))
	if username.startswith("guest_"):
		raise HTTPException(403, detail="계정명은 'guest_'로 시작할 수 없음")
	if password is None:
		raise HTTPException(403, detail="계정을 만드는데 비밀번호를 안 알려주면 뭐 어쩌자는거죠")
	result = session.get(Account, username)
	if result:
		raise HTTPException(403, detail="이미 계정 있음")
	added = Account(username=username, pw_hash=password_hash.hash(password), is_admin=is_admin)
	session.add(added)
	session.commit()
	session.refresh(added)
	print("완료")