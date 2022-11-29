import Image from 'next/image'

export default function ModImage() {
  return (
    <Image
      height={18}
      width={18}
      className="mr-1 inline align-middle"
      alt="twitch mod icon"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAE5SURBVHgBpZQ/TgJBGMXfuNho4STGQhu3sLExMdRG0QPgDYweQFkPoOABzOoBhNhDgj0x0dpCGwtNGBpb1wIbimG+CQwssDOb5SWT+bPf/PZ7b5NlaHgnkAgBcGSTAEOZoe611cbHfIpyaSEXW+cId26nzlmDEOALaSD+0ibK21fWGieIL3I877X0PBfoWnXiL/uuMjuIcimpkUaJIFcuUS9C8HFp9rnJDpo/TVX0Z81F/HdQeDnU80h1T9IovQeS1O4KWRU1maTw607yp1U5vDccTC8GVqiLpGDJSuXzBuH3/cznBmSDzbYSl/Pz1zqP2G3lrZAYaLwbuiS6Qp8frO2r0FfgkgFV8w8GQjYKr0caRi84Xi86QbGwCXb6dmZsaMhGMTHgSdAvsv+LBpKCrAW0QGbJCPAqfZUtm2qML5G2AAAAAElFTkSuQmCC"
    />
  )
}
